import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, booksTable, reviewsTable } from '../db/schema';
import { getReviews } from '../handlers/get_reviews';

describe('getReviews', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return reviews for a specific book with user names', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'reviewer@test.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe'
      })
      .returning()
      .execute();

    // Create test book
    const book = await db.insert(booksTable)
      .values({
        title: 'Test Book',
        author: 'Test Author',
        price: '19.99',
        stock_quantity: 10,
        category: 'Fiction'
      })
      .returning()
      .execute();

    // Create test review
    await db.insert(reviewsTable)
      .values({
        user_id: user[0].id,
        book_id: book[0].id,
        rating: 5,
        comment: 'Great book!'
      })
      .execute();

    const reviews = await getReviews(book[0].id);

    expect(reviews).toHaveLength(1);
    expect(reviews[0].book_id).toEqual(book[0].id);
    expect(reviews[0].user_id).toEqual(user[0].id);
    expect(reviews[0].rating).toEqual(5);
    expect(reviews[0].comment).toEqual('Great book!');
    expect(reviews[0].created_at).toBeInstanceOf(Date);
    expect(reviews[0].updated_at).toBeInstanceOf(Date);
    expect((reviews[0] as any).user_name).toEqual('John Doe');
  });

  it('should return empty array when no reviews exist for book', async () => {
    // Create test book without reviews
    const book = await db.insert(booksTable)
      .values({
        title: 'Test Book',
        author: 'Test Author',
        price: '19.99',
        stock_quantity: 10,
        category: 'Fiction'
      })
      .returning()
      .execute();

    const reviews = await getReviews(book[0].id);

    expect(reviews).toHaveLength(0);
  });

  it('should return reviews ordered by creation date (newest first)', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'reviewer@test.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Smith'
      })
      .returning()
      .execute();

    // Create test book
    const book = await db.insert(booksTable)
      .values({
        title: 'Test Book',
        author: 'Test Author',
        price: '19.99',
        stock_quantity: 10,
        category: 'Fiction'
      })
      .returning()
      .execute();

    // Create multiple reviews with slight delays to ensure different timestamps
    await db.insert(reviewsTable)
      .values({
        user_id: user[0].id,
        book_id: book[0].id,
        rating: 4,
        comment: 'First review'
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(reviewsTable)
      .values({
        user_id: user[0].id,
        book_id: book[0].id,
        rating: 5,
        comment: 'Second review'
      })
      .execute();

    const reviews = await getReviews(book[0].id);

    expect(reviews).toHaveLength(2);
    // Newest first - second review should be first
    expect(reviews[0].comment).toEqual('Second review');
    expect(reviews[1].comment).toEqual('First review');
    expect(reviews[0].created_at.getTime()).toBeGreaterThan(reviews[1].created_at.getTime());
  });

  it('should handle multiple users reviewing the same book', async () => {
    // Create test users
    const user1 = await db.insert(usersTable)
      .values({
        email: 'user1@test.com',
        password_hash: 'hashed_password',
        first_name: 'Alice',
        last_name: 'Johnson'
      })
      .returning()
      .execute();

    const user2 = await db.insert(usersTable)
      .values({
        email: 'user2@test.com',
        password_hash: 'hashed_password',
        first_name: 'Bob',
        last_name: 'Wilson'
      })
      .returning()
      .execute();

    // Create test book
    const book = await db.insert(booksTable)
      .values({
        title: 'Popular Book',
        author: 'Famous Author',
        price: '24.99',
        stock_quantity: 50,
        category: 'Non-Fiction'
      })
      .returning()
      .execute();

    // Create reviews from different users
    await db.insert(reviewsTable)
      .values([
        {
          user_id: user1[0].id,
          book_id: book[0].id,
          rating: 4,
          comment: 'Good read!'
        },
        {
          user_id: user2[0].id,
          book_id: book[0].id,
          rating: 5,
          comment: 'Excellent book!'
        }
      ])
      .execute();

    const reviews = await getReviews(book[0].id);

    expect(reviews).toHaveLength(2);
    
    // Verify each review has correct user information
    const aliceReview = reviews.find(r => r.user_id === user1[0].id);
    const bobReview = reviews.find(r => r.user_id === user2[0].id);
    
    expect(aliceReview).toBeDefined();
    expect(bobReview).toBeDefined();
    expect((aliceReview as any).user_name).toEqual('Alice Johnson');
    expect((bobReview as any).user_name).toEqual('Bob Wilson');
  });

  it('should handle reviews with null comments', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'reviewer@test.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    // Create test book
    const book = await db.insert(booksTable)
      .values({
        title: 'Test Book',
        author: 'Test Author',
        price: '19.99',
        stock_quantity: 10,
        category: 'Fiction'
      })
      .returning()
      .execute();

    // Create review without comment
    await db.insert(reviewsTable)
      .values({
        user_id: user[0].id,
        book_id: book[0].id,
        rating: 3,
        comment: null
      })
      .execute();

    const reviews = await getReviews(book[0].id);

    expect(reviews).toHaveLength(1);
    expect(reviews[0].comment).toBeNull();
    expect(reviews[0].rating).toEqual(3);
    expect((reviews[0] as any).user_name).toEqual('Test User');
  });

  it('should only return reviews for the specified book', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'reviewer@test.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe'
      })
      .returning()
      .execute();

    // Create two test books
    const books = await db.insert(booksTable)
      .values([
        {
          title: 'Book One',
          author: 'Author One',
          price: '19.99',
          stock_quantity: 10,
          category: 'Fiction'
        },
        {
          title: 'Book Two',
          author: 'Author Two',
          price: '24.99',
          stock_quantity: 5,
          category: 'Science'
        }
      ])
      .returning()
      .execute();

    // Create reviews for both books
    await db.insert(reviewsTable)
      .values([
        {
          user_id: user[0].id,
          book_id: books[0].id,
          rating: 4,
          comment: 'Review for book one'
        },
        {
          user_id: user[0].id,
          book_id: books[1].id,
          rating: 5,
          comment: 'Review for book two'
        }
      ])
      .execute();

    // Get reviews for first book only
    const reviewsForBookOne = await getReviews(books[0].id);

    expect(reviewsForBookOne).toHaveLength(1);
    expect(reviewsForBookOne[0].book_id).toEqual(books[0].id);
    expect(reviewsForBookOne[0].comment).toEqual('Review for book one');
  });
});