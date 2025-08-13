import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, booksTable, ordersTable, orderItemsTable, reviewsTable } from '../db/schema';
import { type CreateReviewInput } from '../schema';
import { createReview } from '../handlers/create_review';
import { eq, and } from 'drizzle-orm';

describe('createReview', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  const createTestData = async () => {
    // Create user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    // Create book
    const book = await db.insert(booksTable)
      .values({
        title: 'Test Book',
        author: 'Test Author',
        price: '19.99',
        stock_quantity: 100,
        category: 'Fiction'
      })
      .returning()
      .execute();

    // Create order
    const order = await db.insert(ordersTable)
      .values({
        user_id: user[0].id,
        total_amount: '19.99',
        shipping_address: '123 Test Street, Test City, TC 12345'
      })
      .returning()
      .execute();

    // Create order item (user purchased the book)
    await db.insert(orderItemsTable)
      .values({
        order_id: order[0].id,
        book_id: book[0].id,
        quantity: 1,
        price_at_time: '19.99'
      })
      .execute();

    return { user: user[0], book: book[0], order: order[0] };
  };

  const testInput: CreateReviewInput = {
    book_id: 1,
    rating: 5,
    comment: 'Great book!'
  };

  it('should create a review successfully', async () => {
    const { user, book } = await createTestData();
    
    const input: CreateReviewInput = {
      book_id: book.id,
      rating: 4,
      comment: 'Really enjoyed this book!'
    };

    const result = await createReview(user.id, input);

    expect(result.user_id).toEqual(user.id);
    expect(result.book_id).toEqual(book.id);
    expect(result.rating).toEqual(4);
    expect(result.comment).toEqual('Really enjoyed this book!');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a review with null comment', async () => {
    const { user, book } = await createTestData();
    
    const input: CreateReviewInput = {
      book_id: book.id,
      rating: 3,
      comment: null
    };

    const result = await createReview(user.id, input);

    expect(result.user_id).toEqual(user.id);
    expect(result.book_id).toEqual(book.id);
    expect(result.rating).toEqual(3);
    expect(result.comment).toBeNull();
  });

  it('should save review to database', async () => {
    const { user, book } = await createTestData();
    
    const input: CreateReviewInput = {
      book_id: book.id,
      rating: 5,
      comment: 'Excellent read!'
    };

    const result = await createReview(user.id, input);

    const reviews = await db.select()
      .from(reviewsTable)
      .where(eq(reviewsTable.id, result.id))
      .execute();

    expect(reviews).toHaveLength(1);
    expect(reviews[0].user_id).toEqual(user.id);
    expect(reviews[0].book_id).toEqual(book.id);
    expect(reviews[0].rating).toEqual(5);
    expect(reviews[0].comment).toEqual('Excellent read!');
  });

  it('should throw error if book does not exist', async () => {
    const { user } = await createTestData();
    
    const input: CreateReviewInput = {
      book_id: 99999, // Non-existent book ID
      rating: 4,
      comment: 'This should fail'
    };

    await expect(createReview(user.id, input)).rejects.toThrow(/book not found/i);
  });

  it('should throw error if user has not purchased the book', async () => {
    // Create user and book but no order/order_item
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const book = await db.insert(booksTable)
      .values({
        title: 'Test Book',
        author: 'Test Author',
        price: '19.99',
        stock_quantity: 100,
        category: 'Fiction'
      })
      .returning()
      .execute();

    const input: CreateReviewInput = {
      book_id: book[0].id,
      rating: 4,
      comment: 'This should fail'
    };

    await expect(createReview(user[0].id, input)).rejects.toThrow(/user must purchase the book before reviewing/i);
  });

  it('should throw error if user has already reviewed the book', async () => {
    const { user, book } = await createTestData();

    // Create first review
    const firstInput: CreateReviewInput = {
      book_id: book.id,
      rating: 4,
      comment: 'First review'
    };
    await createReview(user.id, firstInput);

    // Attempt to create second review
    const secondInput: CreateReviewInput = {
      book_id: book.id,
      rating: 5,
      comment: 'Second review attempt'
    };

    await expect(createReview(user.id, secondInput)).rejects.toThrow(/user has already reviewed this book/i);
  });

  it('should allow different users to review the same book', async () => {
    const { user: user1, book } = await createTestData();

    // Create second user with purchase
    const user2 = await db.insert(usersTable)
      .values({
        email: 'test2@example.com',
        password_hash: 'hashedpassword2',
        first_name: 'Test2',
        last_name: 'User2'
      })
      .returning()
      .execute();

    const order2 = await db.insert(ordersTable)
      .values({
        user_id: user2[0].id,
        total_amount: '19.99',
        shipping_address: '456 Test Avenue, Test City, TC 12345'
      })
      .returning()
      .execute();

    await db.insert(orderItemsTable)
      .values({
        order_id: order2[0].id,
        book_id: book.id,
        quantity: 1,
        price_at_time: '19.99'
      })
      .execute();

    const input1: CreateReviewInput = {
      book_id: book.id,
      rating: 4,
      comment: 'First user review'
    };

    const input2: CreateReviewInput = {
      book_id: book.id,
      rating: 5,
      comment: 'Second user review'
    };

    // Both reviews should be created successfully
    const result1 = await createReview(user1.id, input1);
    const result2 = await createReview(user2[0].id, input2);

    expect(result1.id).toBeDefined();
    expect(result2.id).toBeDefined();
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.user_id).not.toEqual(result2.user_id);
  });

  it('should handle edge case ratings correctly', async () => {
    const { user, book } = await createTestData();

    // Test minimum rating
    const minInput: CreateReviewInput = {
      book_id: book.id,
      rating: 1,
      comment: 'Minimum rating'
    };

    const minResult = await createReview(user.id, minInput);
    expect(minResult.rating).toEqual(1);

    // Create another user and book for maximum rating test
    const user2 = await db.insert(usersTable)
      .values({
        email: 'max@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Max',
        last_name: 'User'
      })
      .returning()
      .execute();

    const book2 = await db.insert(booksTable)
      .values({
        title: 'Max Book',
        author: 'Max Author',
        price: '29.99',
        stock_quantity: 50,
        category: 'Non-Fiction'
      })
      .returning()
      .execute();

    const order2 = await db.insert(ordersTable)
      .values({
        user_id: user2[0].id,
        total_amount: '29.99',
        shipping_address: '789 Max Street, Max City, MC 12345'
      })
      .returning()
      .execute();

    await db.insert(orderItemsTable)
      .values({
        order_id: order2[0].id,
        book_id: book2[0].id,
        quantity: 1,
        price_at_time: '29.99'
      })
      .execute();

    // Test maximum rating
    const maxInput: CreateReviewInput = {
      book_id: book2[0].id,
      rating: 5,
      comment: 'Maximum rating'
    };

    const maxResult = await createReview(user2[0].id, maxInput);
    expect(maxResult.rating).toEqual(5);
  });
});