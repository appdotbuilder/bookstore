import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, booksTable, cartItemsTable } from '../db/schema';
import { type UpdateCartItemInput } from '../schema';
import { updateCartItem } from '../handlers/update_cart_item';
import { eq, and } from 'drizzle-orm';

describe('updateCartItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update cart item quantity successfully', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();
    const user = users[0];

    // Create test book with sufficient stock
    const books = await db.insert(booksTable)
      .values({
        title: 'Test Book',
        author: 'Test Author',
        price: '29.99',
        stock_quantity: 50,
        category: 'Fiction'
      })
      .returning()
      .execute();
    const book = books[0];

    // Create cart item
    const cartItems = await db.insert(cartItemsTable)
      .values({
        user_id: user.id,
        book_id: book.id,
        quantity: 2
      })
      .returning()
      .execute();
    const cartItem = cartItems[0];

    const input: UpdateCartItemInput = {
      cart_item_id: cartItem.id,
      quantity: 5
    };

    const result = await updateCartItem(user.id, input);

    // Verify the result
    expect(result.id).toEqual(cartItem.id);
    expect(result.user_id).toEqual(user.id);
    expect(result.book_id).toEqual(book.id);
    expect(result.quantity).toEqual(5);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update cart item in database', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();
    const user = users[0];

    // Create test book
    const books = await db.insert(booksTable)
      .values({
        title: 'Test Book',
        author: 'Test Author',
        price: '29.99',
        stock_quantity: 100,
        category: 'Fiction'
      })
      .returning()
      .execute();
    const book = books[0];

    // Create cart item
    const cartItems = await db.insert(cartItemsTable)
      .values({
        user_id: user.id,
        book_id: book.id,
        quantity: 3
      })
      .returning()
      .execute();
    const cartItem = cartItems[0];

    const input: UpdateCartItemInput = {
      cart_item_id: cartItem.id,
      quantity: 7
    };

    await updateCartItem(user.id, input);

    // Query database to verify update
    const updatedItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, cartItem.id))
      .execute();

    expect(updatedItems).toHaveLength(1);
    expect(updatedItems[0].quantity).toEqual(7);
    expect(updatedItems[0].updated_at).toBeInstanceOf(Date);
    expect(updatedItems[0].updated_at.getTime()).toBeGreaterThan(cartItem.updated_at.getTime());
  });

  it('should throw error when cart item does not exist', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();
    const user = users[0];

    const input: UpdateCartItemInput = {
      cart_item_id: 999, // Non-existent cart item ID
      quantity: 5
    };

    await expect(updateCartItem(user.id, input))
      .rejects
      .toThrow(/cart item not found/i);
  });

  it('should throw error when cart item belongs to different user', async () => {
    // Create two test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          password_hash: 'hashed_password',
          first_name: 'User',
          last_name: 'One'
        },
        {
          email: 'user2@example.com',
          password_hash: 'hashed_password',
          first_name: 'User',
          last_name: 'Two'
        }
      ])
      .returning()
      .execute();
    const user1 = users[0];
    const user2 = users[1];

    // Create test book
    const books = await db.insert(booksTable)
      .values({
        title: 'Test Book',
        author: 'Test Author',
        price: '29.99',
        stock_quantity: 50,
        category: 'Fiction'
      })
      .returning()
      .execute();
    const book = books[0];

    // Create cart item for user1
    const cartItems = await db.insert(cartItemsTable)
      .values({
        user_id: user1.id,
        book_id: book.id,
        quantity: 2
      })
      .returning()
      .execute();
    const cartItem = cartItems[0];

    const input: UpdateCartItemInput = {
      cart_item_id: cartItem.id,
      quantity: 5
    };

    // Try to update user1's cart item as user2
    await expect(updateCartItem(user2.id, input))
      .rejects
      .toThrow(/cart item not found or does not belong to user/i);
  });

  it('should throw error when book no longer exists', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();
    const user = users[0];

    // Create test book
    const books = await db.insert(booksTable)
      .values({
        title: 'Test Book',
        author: 'Test Author',
        price: '29.99',
        stock_quantity: 50,
        category: 'Fiction'
      })
      .returning()
      .execute();
    const book = books[0];

    // Create cart item
    const cartItems = await db.insert(cartItemsTable)
      .values({
        user_id: user.id,
        book_id: book.id,
        quantity: 2
      })
      .returning()
      .execute();
    const cartItem = cartItems[0];

    // Delete the book
    await db.delete(booksTable)
      .where(eq(booksTable.id, book.id))
      .execute();

    const input: UpdateCartItemInput = {
      cart_item_id: cartItem.id,
      quantity: 5
    };

    await expect(updateCartItem(user.id, input))
      .rejects
      .toThrow(/book not found/i);
  });

  it('should throw error when insufficient stock available', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();
    const user = users[0];

    // Create test book with limited stock
    const books = await db.insert(booksTable)
      .values({
        title: 'Limited Stock Book',
        author: 'Test Author',
        price: '29.99',
        stock_quantity: 3, // Only 3 in stock
        category: 'Fiction'
      })
      .returning()
      .execute();
    const book = books[0];

    // Create cart item
    const cartItems = await db.insert(cartItemsTable)
      .values({
        user_id: user.id,
        book_id: book.id,
        quantity: 1
      })
      .returning()
      .execute();
    const cartItem = cartItems[0];

    const input: UpdateCartItemInput = {
      cart_item_id: cartItem.id,
      quantity: 5 // Requesting more than available stock
    };

    await expect(updateCartItem(user.id, input))
      .rejects
      .toThrow(/insufficient stock.*available: 3.*requested: 5/i);
  });

  it('should allow updating to same quantity as current stock', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();
    const user = users[0];

    // Create test book with exact stock
    const books = await db.insert(booksTable)
      .values({
        title: 'Exact Stock Book',
        author: 'Test Author',
        price: '29.99',
        stock_quantity: 10,
        category: 'Fiction'
      })
      .returning()
      .execute();
    const book = books[0];

    // Create cart item
    const cartItems = await db.insert(cartItemsTable)
      .values({
        user_id: user.id,
        book_id: book.id,
        quantity: 5
      })
      .returning()
      .execute();
    const cartItem = cartItems[0];

    const input: UpdateCartItemInput = {
      cart_item_id: cartItem.id,
      quantity: 10 // Exactly the stock quantity
    };

    const result = await updateCartItem(user.id, input);

    expect(result.quantity).toEqual(10);
    expect(result.id).toEqual(cartItem.id);
  });
});