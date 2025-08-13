import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, booksTable, cartItemsTable } from '../db/schema';
import { removeFromCart } from '../handlers/remove_from_cart';
import { eq, and } from 'drizzle-orm';

describe('removeFromCart', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should remove cart item successfully', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test book
    const bookResult = await db.insert(booksTable)
      .values({
        title: 'Test Book',
        author: 'Test Author',
        isbn: '1234567890',
        description: 'A test book',
        price: '19.99',
        stock_quantity: 100,
        category: 'Fiction',
        publication_year: 2023,
        publisher: 'Test Publisher',
        cover_image_url: 'https://example.com/cover.jpg'
      })
      .returning()
      .execute();
    const bookId = bookResult[0].id;

    // Create cart item
    const cartItemResult = await db.insert(cartItemsTable)
      .values({
        user_id: userId,
        book_id: bookId,
        quantity: 2
      })
      .returning()
      .execute();
    const cartItemId = cartItemResult[0].id;

    // Remove from cart
    const result = await removeFromCart(userId, cartItemId);

    expect(result).toBe(true);

    // Verify item was deleted from database
    const remainingItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, cartItemId))
      .execute();

    expect(remainingItems).toHaveLength(0);
  });

  it('should return false when cart item does not exist', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Try to remove non-existent cart item
    const result = await removeFromCart(userId, 999);

    expect(result).toBe(false);
  });

  it('should return false when cart item belongs to different user', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed_password',
        first_name: 'User',
        last_name: 'One'
      })
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        first_name: 'User',
        last_name: 'Two'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create test book
    const bookResult = await db.insert(booksTable)
      .values({
        title: 'Test Book',
        author: 'Test Author',
        isbn: '1234567890',
        description: 'A test book',
        price: '19.99',
        stock_quantity: 100,
        category: 'Fiction',
        publication_year: 2023,
        publisher: 'Test Publisher',
        cover_image_url: 'https://example.com/cover.jpg'
      })
      .returning()
      .execute();
    const bookId = bookResult[0].id;

    // Create cart item for user1
    const cartItemResult = await db.insert(cartItemsTable)
      .values({
        user_id: user1Id,
        book_id: bookId,
        quantity: 2
      })
      .returning()
      .execute();
    const cartItemId = cartItemResult[0].id;

    // Try to remove user1's cart item as user2
    const result = await removeFromCart(user2Id, cartItemId);

    expect(result).toBe(false);

    // Verify item still exists in database
    const remainingItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, cartItemId))
      .execute();

    expect(remainingItems).toHaveLength(1);
    expect(remainingItems[0].user_id).toBe(user1Id);
  });

  it('should not affect other cart items when removing one item', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create two test books
    const book1Result = await db.insert(booksTable)
      .values({
        title: 'Test Book 1',
        author: 'Test Author 1',
        isbn: '1234567890',
        description: 'A test book',
        price: '19.99',
        stock_quantity: 100,
        category: 'Fiction',
        publication_year: 2023,
        publisher: 'Test Publisher',
        cover_image_url: 'https://example.com/cover1.jpg'
      })
      .returning()
      .execute();
    const book1Id = book1Result[0].id;

    const book2Result = await db.insert(booksTable)
      .values({
        title: 'Test Book 2',
        author: 'Test Author 2',
        isbn: '0987654321',
        description: 'Another test book',
        price: '29.99',
        stock_quantity: 50,
        category: 'Non-Fiction',
        publication_year: 2023,
        publisher: 'Test Publisher',
        cover_image_url: 'https://example.com/cover2.jpg'
      })
      .returning()
      .execute();
    const book2Id = book2Result[0].id;

    // Create two cart items
    const cartItem1Result = await db.insert(cartItemsTable)
      .values({
        user_id: userId,
        book_id: book1Id,
        quantity: 2
      })
      .returning()
      .execute();
    const cartItem1Id = cartItem1Result[0].id;

    const cartItem2Result = await db.insert(cartItemsTable)
      .values({
        user_id: userId,
        book_id: book2Id,
        quantity: 1
      })
      .returning()
      .execute();
    const cartItem2Id = cartItem2Result[0].id;

    // Remove first cart item
    const result = await removeFromCart(userId, cartItem1Id);

    expect(result).toBe(true);

    // Verify first item was deleted
    const deletedItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, cartItem1Id))
      .execute();

    expect(deletedItems).toHaveLength(0);

    // Verify second item still exists
    const remainingItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, cartItem2Id))
      .execute();

    expect(remainingItems).toHaveLength(1);
    expect(remainingItems[0].book_id).toBe(book2Id);
    expect(remainingItems[0].quantity).toBe(1);
  });
});