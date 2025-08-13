import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, booksTable, cartItemsTable } from '../db/schema';
import { type AddToCartInput } from '../schema';
import { addToCart } from '../handlers/add_to_cart';
import { eq, and } from 'drizzle-orm';

describe('addToCart', () => {
  let testUserId: number;
  let testBookId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResults = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword123',
        first_name: 'John',
        last_name: 'Doe'
      })
      .returning()
      .execute();
    
    testUserId = userResults[0].id;

    // Create test book
    const bookResults = await db.insert(booksTable)
      .values({
        title: 'Test Book',
        author: 'Test Author',
        isbn: '978-0123456789',
        description: 'A test book',
        price: '19.99',
        stock_quantity: 10,
        category: 'Fiction'
      })
      .returning()
      .execute();

    testBookId = bookResults[0].id;
  });

  afterEach(resetDB);

  it('should add a new item to cart', async () => {
    const input: AddToCartInput = {
      book_id: testBookId,
      quantity: 2
    };

    const result = await addToCart(testUserId, input);

    expect(result.user_id).toEqual(testUserId);
    expect(result.book_id).toEqual(testBookId);
    expect(result.quantity).toEqual(2);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save cart item to database', async () => {
    const input: AddToCartInput = {
      book_id: testBookId,
      quantity: 3
    };

    const result = await addToCart(testUserId, input);

    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, result.id))
      .execute();

    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].user_id).toEqual(testUserId);
    expect(cartItems[0].book_id).toEqual(testBookId);
    expect(cartItems[0].quantity).toEqual(3);
  });

  it('should update quantity if item already exists in cart', async () => {
    // First add item to cart
    const input1: AddToCartInput = {
      book_id: testBookId,
      quantity: 2
    };

    const firstResult = await addToCart(testUserId, input1);

    // Add same item again
    const input2: AddToCartInput = {
      book_id: testBookId,
      quantity: 3
    };

    const secondResult = await addToCart(testUserId, input2);

    // Should be the same cart item with updated quantity
    expect(secondResult.id).toEqual(firstResult.id);
    expect(secondResult.quantity).toEqual(5); // 2 + 3
    expect(secondResult.updated_at > firstResult.updated_at).toBe(true);

    // Verify only one cart item exists in database
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(and(
        eq(cartItemsTable.user_id, testUserId),
        eq(cartItemsTable.book_id, testBookId)
      ))
      .execute();

    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].quantity).toEqual(5);
  });

  it('should throw error when book does not exist', async () => {
    const input: AddToCartInput = {
      book_id: 999999, // Non-existent book ID
      quantity: 1
    };

    await expect(addToCart(testUserId, input)).rejects.toThrow(/Book with id 999999 not found/);
  });

  it('should throw error when insufficient stock for new item', async () => {
    const input: AddToCartInput = {
      book_id: testBookId,
      quantity: 15 // More than available stock (10)
    };

    await expect(addToCart(testUserId, input)).rejects.toThrow(/Insufficient stock/);
  });

  it('should throw error when total quantity would exceed stock', async () => {
    // First add 8 items to cart
    const input1: AddToCartInput = {
      book_id: testBookId,
      quantity: 8
    };

    await addToCart(testUserId, input1);

    // Try to add 5 more (total would be 13, but stock is 10)
    const input2: AddToCartInput = {
      book_id: testBookId,
      quantity: 5
    };

    await expect(addToCart(testUserId, input2)).rejects.toThrow(/Total quantity would exceed available stock/);
  });

  it('should handle different users adding same book', async () => {
    // Create second user
    const secondUserResults = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashedpassword456',
        first_name: 'Jane',
        last_name: 'Smith'
      })
      .returning()
      .execute();

    const secondUserId = secondUserResults[0].id;

    const input: AddToCartInput = {
      book_id: testBookId,
      quantity: 3
    };

    // Both users add same book to their carts
    const result1 = await addToCart(testUserId, input);
    const result2 = await addToCart(secondUserId, input);

    expect(result1.user_id).toEqual(testUserId);
    expect(result2.user_id).toEqual(secondUserId);
    expect(result1.id).not.toEqual(result2.id);

    // Verify separate cart items exist
    const allCartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.book_id, testBookId))
      .execute();

    expect(allCartItems).toHaveLength(2);
    expect(allCartItems.some(item => item.user_id === testUserId)).toBe(true);
    expect(allCartItems.some(item => item.user_id === secondUserId)).toBe(true);
  });

  it('should handle adding exactly the available stock quantity', async () => {
    const input: AddToCartInput = {
      book_id: testBookId,
      quantity: 10 // Exactly the available stock
    };

    const result = await addToCart(testUserId, input);

    expect(result.quantity).toEqual(10);
    expect(result.user_id).toEqual(testUserId);
    expect(result.book_id).toEqual(testBookId);
  });
});