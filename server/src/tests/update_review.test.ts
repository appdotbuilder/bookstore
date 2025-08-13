import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, booksTable, reviewsTable } from '../db/schema';
import { type UpdateReviewInput } from '../schema';
import { updateReview } from '../handlers/update_review';
import { eq, and } from 'drizzle-orm';

describe('updateReview', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create prerequisite data
  const createTestData = async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'testuser@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    // Create another user for authorization tests
    const otherUsers = await db.insert(usersTable)
      .values({
        email: 'otheruser@example.com',
        password_hash: 'hashed_password',
        first_name: 'Other',
        last_name: 'User'
      })
      .returning()
      .execute();

    // Create test book
    const books = await db.insert(booksTable)
      .values({
        title: 'Test Book',
        author: 'Test Author',
        isbn: '123-456-789',
        description: 'A test book',
        price: '29.99',
        stock_quantity: 10,
        category: 'Fiction',
        publication_year: 2023,
        publisher: 'Test Publisher',
        cover_image_url: 'https://example.com/cover.jpg'
      })
      .returning()
      .execute();

    // Create test review
    const reviews = await db.insert(reviewsTable)
      .values({
        user_id: users[0].id,
        book_id: books[0].id,
        rating: 4,
        comment: 'Original review comment'
      })
      .returning()
      .execute();

    return {
      user: users[0],
      otherUser: otherUsers[0],
      book: books[0],
      review: reviews[0]
    };
  };

  it('should update review rating only', async () => {
    const { user, review } = await createTestData();

    const input: UpdateReviewInput = {
      review_id: review.id,
      rating: 5
    };

    const result = await updateReview(user.id, input);

    expect(result.id).toEqual(review.id);
    expect(result.user_id).toEqual(user.id);
    expect(result.rating).toEqual(5);
    expect(result.comment).toEqual('Original review comment'); // Should preserve original comment
    expect(result.created_at).toEqual(review.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(review.updated_at.getTime());
  });

  it('should update review comment only', async () => {
    const { user, review } = await createTestData();

    const input: UpdateReviewInput = {
      review_id: review.id,
      comment: 'Updated review comment'
    };

    const result = await updateReview(user.id, input);

    expect(result.id).toEqual(review.id);
    expect(result.user_id).toEqual(user.id);
    expect(result.rating).toEqual(4); // Should preserve original rating
    expect(result.comment).toEqual('Updated review comment');
    expect(result.created_at).toEqual(review.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(review.updated_at.getTime());
  });

  it('should update both rating and comment', async () => {
    const { user, review } = await createTestData();

    const input: UpdateReviewInput = {
      review_id: review.id,
      rating: 3,
      comment: 'Completely updated review'
    };

    const result = await updateReview(user.id, input);

    expect(result.id).toEqual(review.id);
    expect(result.user_id).toEqual(user.id);
    expect(result.rating).toEqual(3);
    expect(result.comment).toEqual('Completely updated review');
    expect(result.created_at).toEqual(review.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(review.updated_at.getTime());
  });

  it('should set comment to null when explicitly provided', async () => {
    const { user, review } = await createTestData();

    const input: UpdateReviewInput = {
      review_id: review.id,
      rating: 2,
      comment: null
    };

    const result = await updateReview(user.id, input);

    expect(result.id).toEqual(review.id);
    expect(result.user_id).toEqual(user.id);
    expect(result.rating).toEqual(2);
    expect(result.comment).toBeNull();
    expect(result.created_at).toEqual(review.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated review to database', async () => {
    const { user, review } = await createTestData();

    const input: UpdateReviewInput = {
      review_id: review.id,
      rating: 1,
      comment: 'Database verification comment'
    };

    await updateReview(user.id, input);

    // Verify the update in database
    const updatedReviews = await db.select()
      .from(reviewsTable)
      .where(eq(reviewsTable.id, review.id))
      .execute();

    expect(updatedReviews).toHaveLength(1);
    const updatedReview = updatedReviews[0];
    expect(updatedReview.rating).toEqual(1);
    expect(updatedReview.comment).toEqual('Database verification comment');
    expect(updatedReview.updated_at).toBeInstanceOf(Date);
    expect(updatedReview.updated_at.getTime()).toBeGreaterThan(review.updated_at.getTime());
  });

  it('should throw error when review does not exist', async () => {
    const { user } = await createTestData();

    const input: UpdateReviewInput = {
      review_id: 99999, // Non-existent review ID
      rating: 5
    };

    await expect(updateReview(user.id, input)).rejects.toThrow(/review not found/i);
  });

  it('should throw error when user tries to update another users review', async () => {
    const { otherUser, review } = await createTestData();

    const input: UpdateReviewInput = {
      review_id: review.id,
      rating: 5
    };

    // Try to update with different user ID
    await expect(updateReview(otherUser.id, input)).rejects.toThrow(/review not found or access denied/i);
  });

  it('should preserve original values when no updates provided', async () => {
    const { user, review } = await createTestData();

    // Create input with only review_id (no rating or comment updates)
    const input: UpdateReviewInput = {
      review_id: review.id
    };

    const result = await updateReview(user.id, input);

    // Should preserve original values but update timestamp
    expect(result.rating).toEqual(4); // Original rating
    expect(result.comment).toEqual('Original review comment'); // Original comment
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(review.updated_at.getTime());
  });

  it('should handle review with null comment initially', async () => {
    const { user, book } = await createTestData();

    // Create review with null comment
    const nullCommentReviews = await db.insert(reviewsTable)
      .values({
        user_id: user.id,
        book_id: book.id,
        rating: 3,
        comment: null
      })
      .returning()
      .execute();

    const nullCommentReview = nullCommentReviews[0];

    const input: UpdateReviewInput = {
      review_id: nullCommentReview.id,
      rating: 4,
      comment: 'Adding comment to previously null comment review'
    };

    const result = await updateReview(user.id, input);

    expect(result.rating).toEqual(4);
    expect(result.comment).toEqual('Adding comment to previously null comment review');
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});