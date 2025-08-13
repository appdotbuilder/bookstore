import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, booksTable, cartItemsTable, ordersTable, orderItemsTable } from '../db/schema';
import { type CreateOrderInput } from '../schema';
import { createOrder } from '../handlers/create_order';
import { eq } from 'drizzle-orm';

// Test input
const testInput: CreateOrderInput = {
  shipping_address: '123 Test Street, Test City, Test State 12345'
};

describe('createOrder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an order from cart items', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    // Create test books
    const [book1, book2] = await db.insert(booksTable)
      .values([
        {
          title: 'Test Book 1',
          author: 'Test Author 1',
          price: '19.99',
          stock_quantity: 10,
          category: 'Fiction'
        },
        {
          title: 'Test Book 2',
          author: 'Test Author 2',
          price: '29.99',
          stock_quantity: 5,
          category: 'Non-Fiction'
        }
      ])
      .returning()
      .execute();

    // Add items to cart
    await db.insert(cartItemsTable)
      .values([
        {
          user_id: user.id,
          book_id: book1.id,
          quantity: 2
        },
        {
          user_id: user.id,
          book_id: book2.id,
          quantity: 1
        }
      ])
      .execute();

    const result = await createOrder(user.id, testInput);

    // Verify order fields
    expect(result.user_id).toEqual(user.id);
    expect(result.total_amount).toEqual(69.97); // (19.99 * 2) + (29.99 * 1)
    expect(result.status).toEqual('pending');
    expect(result.shipping_address).toEqual(testInput.shipping_address);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(typeof result.total_amount).toBe('number');
  });

  it('should save order to database with correct data', async () => {
    // Create test data
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const [book] = await db.insert(booksTable)
      .values({
        title: 'Test Book',
        author: 'Test Author',
        price: '25.50',
        stock_quantity: 5,
        category: 'Fiction'
      })
      .returning()
      .execute();

    await db.insert(cartItemsTable)
      .values({
        user_id: user.id,
        book_id: book.id,
        quantity: 2
      })
      .execute();

    const result = await createOrder(user.id, testInput);

    // Verify order in database
    const orders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, result.id))
      .execute();

    expect(orders).toHaveLength(1);
    expect(orders[0].user_id).toEqual(user.id);
    expect(parseFloat(orders[0].total_amount)).toEqual(51.00); // 25.50 * 2
    expect(orders[0].status).toEqual('pending');
    expect(orders[0].shipping_address).toEqual(testInput.shipping_address);
  });

  it('should create order items correctly', async () => {
    // Create test data
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const [book1, book2] = await db.insert(booksTable)
      .values([
        {
          title: 'Book One',
          author: 'Author One',
          price: '15.99',
          stock_quantity: 8,
          category: 'Fiction'
        },
        {
          title: 'Book Two',
          author: 'Author Two',
          price: '22.50',
          stock_quantity: 3,
          category: 'Science'
        }
      ])
      .returning()
      .execute();

    await db.insert(cartItemsTable)
      .values([
        {
          user_id: user.id,
          book_id: book1.id,
          quantity: 3
        },
        {
          user_id: user.id,
          book_id: book2.id,
          quantity: 1
        }
      ])
      .execute();

    const result = await createOrder(user.id, testInput);

    // Verify order items
    const orderItems = await db.select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.order_id, result.id))
      .execute();

    expect(orderItems).toHaveLength(2);

    const item1 = orderItems.find(item => item.book_id === book1.id);
    const item2 = orderItems.find(item => item.book_id === book2.id);

    expect(item1).toBeDefined();
    expect(item1!.quantity).toEqual(3);
    expect(parseFloat(item1!.price_at_time)).toEqual(15.99);

    expect(item2).toBeDefined();
    expect(item2!.quantity).toEqual(1);
    expect(parseFloat(item2!.price_at_time)).toEqual(22.50);
  });

  it('should update book stock quantities', async () => {
    // Create test data
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const [book] = await db.insert(booksTable)
      .values({
        title: 'Test Book',
        author: 'Test Author',
        price: '20.00',
        stock_quantity: 10,
        category: 'Fiction'
      })
      .returning()
      .execute();

    await db.insert(cartItemsTable)
      .values({
        user_id: user.id,
        book_id: book.id,
        quantity: 3
      })
      .execute();

    await createOrder(user.id, testInput);

    // Check updated stock
    const updatedBook = await db.select()
      .from(booksTable)
      .where(eq(booksTable.id, book.id))
      .execute();

    expect(updatedBook[0].stock_quantity).toEqual(7); // 10 - 3
  });

  it('should clear user cart after order creation', async () => {
    // Create test data
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const [book] = await db.insert(booksTable)
      .values({
        title: 'Test Book',
        author: 'Test Author',
        price: '15.00',
        stock_quantity: 5,
        category: 'Fiction'
      })
      .returning()
      .execute();

    await db.insert(cartItemsTable)
      .values({
        user_id: user.id,
        book_id: book.id,
        quantity: 2
      })
      .execute();

    await createOrder(user.id, testInput);

    // Verify cart is empty
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.user_id, user.id))
      .execute();

    expect(cartItems).toHaveLength(0);
  });

  it('should throw error when cart is empty', async () => {
    // Create user but no cart items
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    await expect(createOrder(user.id, testInput)).rejects.toThrow(/cart is empty/i);
  });

  it('should throw error when insufficient stock', async () => {
    // Create test data with insufficient stock
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const [book] = await db.insert(booksTable)
      .values({
        title: 'Low Stock Book',
        author: 'Test Author',
        price: '10.00',
        stock_quantity: 2, // Only 2 in stock
        category: 'Fiction'
      })
      .returning()
      .execute();

    await db.insert(cartItemsTable)
      .values({
        user_id: user.id,
        book_id: book.id,
        quantity: 5 // Trying to order 5 when only 2 available
      })
      .execute();

    await expect(createOrder(user.id, testInput)).rejects.toThrow(/insufficient stock/i);
  });

  it('should handle transaction rollback on failure', async () => {
    // Create test data
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const [book] = await db.insert(booksTable)
      .values({
        title: 'Test Book',
        author: 'Test Author',
        price: '15.00',
        stock_quantity: 2,
        category: 'Fiction'
      })
      .returning()
      .execute();

    await db.insert(cartItemsTable)
      .values({
        user_id: user.id,
        book_id: book.id,
        quantity: 5 // This will cause insufficient stock error
      })
      .execute();

    const originalStock = book.stock_quantity;
    const originalCartCount = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.user_id, user.id))
      .execute();

    // Attempt order creation (should fail)
    await expect(createOrder(user.id, testInput)).rejects.toThrow();

    // Verify no changes were made due to transaction rollback
    const bookAfterFailure = await db.select()
      .from(booksTable)
      .where(eq(booksTable.id, book.id))
      .execute();

    const cartAfterFailure = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.user_id, user.id))
      .execute();

    const ordersAfterFailure = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.user_id, user.id))
      .execute();

    expect(bookAfterFailure[0].stock_quantity).toEqual(originalStock);
    expect(cartAfterFailure).toHaveLength(originalCartCount.length);
    expect(ordersAfterFailure).toHaveLength(0);
  });
});