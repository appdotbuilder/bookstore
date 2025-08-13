import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, booksTable, ordersTable, orderItemsTable } from '../db/schema';
import { getOrders } from '../handlers/get_orders';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'testuser@example.com',
  password_hash: 'hashedpassword123',
  first_name: 'Test',
  last_name: 'User'
};

const testBook1 = {
  title: 'Test Book 1',
  author: 'Test Author 1',
  isbn: '978-1234567890',
  description: 'A test book',
  price: '29.99',
  stock_quantity: 10,
  category: 'Fiction',
  publication_year: 2023,
  publisher: 'Test Publisher',
  cover_image_url: 'https://example.com/cover1.jpg'
};

const testBook2 = {
  title: 'Test Book 2',
  author: 'Test Author 2',
  isbn: '978-0987654321',
  description: 'Another test book',
  price: '19.99',
  stock_quantity: 5,
  category: 'Non-Fiction',
  publication_year: 2022,
  publisher: 'Another Publisher',
  cover_image_url: 'https://example.com/cover2.jpg'
};

describe('getOrders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no orders', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    const result = await getOrders(userId);

    expect(result).toEqual([]);
  });

  it('should return orders for a specific user', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create books
    const bookResults = await db.insert(booksTable)
      .values([testBook1, testBook2])
      .returning()
      .execute();

    const book1Id = bookResults[0].id;
    const book2Id = bookResults[1].id;

    // Create orders
    const orderResults = await db.insert(ordersTable)
      .values([
        {
          user_id: userId,
          total_amount: '49.98',
          status: 'confirmed',
          shipping_address: '123 Main St, City, State 12345'
        },
        {
          user_id: userId,
          total_amount: '29.99',
          status: 'pending',
          shipping_address: '456 Oak Ave, City, State 12345'
        }
      ])
      .returning()
      .execute();

    const order1Id = orderResults[0].id;
    const order2Id = orderResults[1].id;

    // Create order items
    await db.insert(orderItemsTable)
      .values([
        {
          order_id: order1Id,
          book_id: book1Id,
          quantity: 1,
          price_at_time: '29.99'
        },
        {
          order_id: order1Id,
          book_id: book2Id,
          quantity: 1,
          price_at_time: '19.99'
        },
        {
          order_id: order2Id,
          book_id: book1Id,
          quantity: 1,
          price_at_time: '29.99'
        }
      ])
      .execute();

    const result = await getOrders(userId);

    // Should return orders ordered by creation date (newest first)
    expect(result).toHaveLength(2);

    // Find orders by their amounts since order might vary
    const order49 = result.find(o => o.total_amount === 49.98);
    const order29 = result.find(o => o.total_amount === 29.99);

    expect(order49).toBeDefined();
    expect(order29).toBeDefined();

    // Check order with amount 49.98
    expect(order49!.id).toEqual(order1Id);
    expect(order49!.user_id).toEqual(userId);
    expect(typeof order49!.total_amount).toBe('number');
    expect(order49!.status).toEqual('confirmed');
    expect(order49!.shipping_address).toEqual('123 Main St, City, State 12345');
    expect(order49!.created_at).toBeInstanceOf(Date);
    expect(order49!.updated_at).toBeInstanceOf(Date);

    // Check order with amount 29.99
    expect(order29!.id).toEqual(order2Id);
    expect(order29!.user_id).toEqual(userId);
    expect(typeof order29!.total_amount).toBe('number');
    expect(order29!.status).toEqual('pending');
    expect(order29!.shipping_address).toEqual('456 Oak Ave, City, State 12345');
    expect(order29!.created_at).toBeInstanceOf(Date);
    expect(order29!.updated_at).toBeInstanceOf(Date);
  });

  it('should not return orders for other users', async () => {
    // Create two users
    const userResults = await db.insert(usersTable)
      .values([
        testUser,
        {
          email: 'otheruser@example.com',
          password_hash: 'hashedpassword456',
          first_name: 'Other',
          last_name: 'User'
        }
      ])
      .returning()
      .execute();

    const user1Id = userResults[0].id;
    const user2Id = userResults[1].id;

    // Create book
    const bookResult = await db.insert(booksTable)
      .values(testBook1)
      .returning()
      .execute();

    const bookId = bookResult[0].id;

    // Create orders for both users
    const orderResults = await db.insert(ordersTable)
      .values([
        {
          user_id: user1Id,
          total_amount: '29.99',
          status: 'confirmed',
          shipping_address: '123 Main St, City, State 12345'
        },
        {
          user_id: user2Id,
          total_amount: '19.99',
          status: 'pending',
          shipping_address: '456 Oak Ave, City, State 12345'
        }
      ])
      .returning()
      .execute();

    // Create order items
    await db.insert(orderItemsTable)
      .values([
        {
          order_id: orderResults[0].id,
          book_id: bookId,
          quantity: 1,
          price_at_time: '29.99'
        },
        {
          order_id: orderResults[1].id,
          book_id: bookId,
          quantity: 1,
          price_at_time: '19.99'
        }
      ])
      .execute();

    // Get orders for user1 - should only return user1's orders
    const result = await getOrders(user1Id);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(user1Id);
    expect(result[0].total_amount).toEqual(29.99);
  });

  it('should handle orders without order items', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create order without order items
    await db.insert(ordersTable)
      .values({
        user_id: userId,
        total_amount: '0.00',
        status: 'cancelled',
        shipping_address: '123 Main St, City, State 12345'
      })
      .execute();

    const result = await getOrders(userId);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(userId);
    expect(result[0].total_amount).toEqual(0);
    expect(result[0].status).toEqual('cancelled');
  });

  it('should return orders in correct chronological order', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create book
    const bookResult = await db.insert(booksTable)
      .values(testBook1)
      .returning()
      .execute();

    const bookId = bookResult[0].id;

    // Create orders one by one to ensure different timestamps
    const order1Result = await db.insert(ordersTable)
      .values({
        user_id: userId,
        total_amount: '10.00',
        status: 'pending',
        shipping_address: '123 First St'
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    const order2Result = await db.insert(ordersTable)
      .values({
        user_id: userId,
        total_amount: '20.00',
        status: 'confirmed',
        shipping_address: '456 Second Ave'
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    const order3Result = await db.insert(ordersTable)
      .values({
        user_id: userId,
        total_amount: '30.00',
        status: 'delivered',
        shipping_address: '789 Third Blvd'
      })
      .returning()
      .execute();

    // Add order items
    const allOrders = [order1Result[0], order2Result[0], order3Result[0]];
    for (const order of allOrders) {
      await db.insert(orderItemsTable)
        .values({
          order_id: order.id,
          book_id: bookId,
          quantity: 1,
          price_at_time: order.total_amount
        })
        .execute();
    }

    const result = await getOrders(userId);

    expect(result).toHaveLength(3);

    // Verify chronological order (newest first)
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].created_at >= result[i + 1].created_at).toBe(true);
    }

    // The last created order (30.00) should be first in results
    expect(result[0].total_amount).toEqual(30.00);
    expect(result[1].total_amount).toEqual(20.00);
    expect(result[2].total_amount).toEqual(10.00);
  });

  it('should handle numeric conversion correctly', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create book
    const bookResult = await db.insert(booksTable)
      .values(testBook1)
      .returning()
      .execute();

    const bookId = bookResult[0].id;

    // Create order with decimal amount
    const orderResult = await db.insert(ordersTable)
      .values({
        user_id: userId,
        total_amount: '123.45',
        status: 'confirmed',
        shipping_address: '123 Main St, City, State 12345'
      })
      .returning()
      .execute();

    await db.insert(orderItemsTable)
      .values({
        order_id: orderResult[0].id,
        book_id: bookId,
        quantity: 2,
        price_at_time: '61.725'
      })
      .execute();

    const result = await getOrders(userId);

    expect(result).toHaveLength(1);
    expect(typeof result[0].total_amount).toBe('number');
    expect(result[0].total_amount).toEqual(123.45);
  });
});