import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, booksTable, ordersTable, orderItemsTable } from '../db/schema';
import { type CreateUserInput, type CreateBookInput, type CreateOrderInput } from '../schema';
import { getOrderById } from '../handlers/get_order_by_id';

// Test data
const testUser: CreateUserInput = {
  email: 'testuser@example.com',
  password: 'password123',
  first_name: 'Test',
  last_name: 'User'
};

const anotherUser: CreateUserInput = {
  email: 'anotheruser@example.com',
  password: 'password123',
  first_name: 'Another',
  last_name: 'User'
};

const testBook: CreateBookInput = {
  title: 'Test Book',
  author: 'Test Author',
  isbn: '978-0123456789',
  description: 'A test book',
  price: 29.99,
  stock_quantity: 100,
  category: 'Fiction',
  publication_year: 2023,
  publisher: 'Test Publisher',
  cover_image_url: 'https://example.com/cover.jpg'
};

describe('getOrderById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return order when found and belongs to user', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashedpassword',
        first_name: testUser.first_name,
        last_name: testUser.last_name
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create book
    const bookResult = await db.insert(booksTable)
      .values({
        ...testBook,
        price: testBook.price.toString()
      })
      .returning()
      .execute();

    const bookId = bookResult[0].id;

    // Create order
    const orderResult = await db.insert(ordersTable)
      .values({
        user_id: userId,
        total_amount: '59.98', // String for numeric column
        status: 'confirmed',
        shipping_address: '123 Test Street, Test City, TC 12345'
      })
      .returning()
      .execute();

    const orderId = orderResult[0].id;

    // Create order items
    await db.insert(orderItemsTable)
      .values({
        order_id: orderId,
        book_id: bookId,
        quantity: 2,
        price_at_time: testBook.price.toString()
      })
      .execute();

    // Test the handler
    const result = await getOrderById(userId, orderId);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(orderId);
    expect(result!.user_id).toEqual(userId);
    expect(result!.total_amount).toEqual(59.98);
    expect(typeof result!.total_amount).toEqual('number');
    expect(result!.status).toEqual('confirmed');
    expect(result!.shipping_address).toEqual('123 Test Street, Test City, TC 12345');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when order does not exist', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashedpassword',
        first_name: testUser.first_name,
        last_name: testUser.last_name
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const nonExistentOrderId = 999;

    // Test the handler
    const result = await getOrderById(userId, nonExistentOrderId);

    // Verify null is returned
    expect(result).toBeNull();
  });

  it('should return null when order exists but belongs to different user', async () => {
    // Create first user
    const userResult1 = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashedpassword',
        first_name: testUser.first_name,
        last_name: testUser.last_name
      })
      .returning()
      .execute();

    const userId1 = userResult1[0].id;

    // Create second user
    const userResult2 = await db.insert(usersTable)
      .values({
        email: anotherUser.email,
        password_hash: 'hashedpassword',
        first_name: anotherUser.first_name,
        last_name: anotherUser.last_name
      })
      .returning()
      .execute();

    const userId2 = userResult2[0].id;

    // Create order for user1
    const orderResult = await db.insert(ordersTable)
      .values({
        user_id: userId1,
        total_amount: '29.99',
        status: 'pending',
        shipping_address: '456 Another Street, Another City, AC 67890'
      })
      .returning()
      .execute();

    const orderId = orderResult[0].id;

    // Try to get the order as user2
    const result = await getOrderById(userId2, orderId);

    // Verify null is returned (order doesn't belong to user2)
    expect(result).toBeNull();
  });

  it('should handle orders with different statuses correctly', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashedpassword',
        first_name: testUser.first_name,
        last_name: testUser.last_name
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create orders with different statuses
    const statuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;
    
    for (const status of statuses) {
      const orderResult = await db.insert(ordersTable)
        .values({
          user_id: userId,
          total_amount: '15.99',
          status: status,
          shipping_address: '789 Status Street, Status City, SC 11111'
        })
        .returning()
        .execute();

      const orderId = orderResult[0].id;

      // Test the handler
      const result = await getOrderById(userId, orderId);

      // Verify the result
      expect(result).not.toBeNull();
      expect(result!.status).toEqual(status);
      expect(result!.user_id).toEqual(userId);
      expect(result!.total_amount).toEqual(15.99);
      expect(typeof result!.total_amount).toEqual('number');
    }
  });

  it('should correctly handle numeric precision for total_amount', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashedpassword',
        first_name: testUser.first_name,
        last_name: testUser.last_name
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Test various decimal amounts
    const testAmounts = ['99.99', '0.01', '1000.00', '123.45'];

    for (const amount of testAmounts) {
      const orderResult = await db.insert(ordersTable)
        .values({
          user_id: userId,
          total_amount: amount,
          status: 'confirmed',
          shipping_address: 'Test Address'
        })
        .returning()
        .execute();

      const orderId = orderResult[0].id;

      // Test the handler
      const result = await getOrderById(userId, orderId);

      // Verify numeric conversion
      expect(result).not.toBeNull();
      expect(result!.total_amount).toEqual(parseFloat(amount));
      expect(typeof result!.total_amount).toEqual('number');
    }
  });
});