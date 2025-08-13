import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, booksTable, reviewsTable } from '../db/schema';
import { deleteReview } from '../handlers/delete_review';
import { eq } from 'drizzle-orm';

describe('deleteReview', () => {
  let testUserId: number;
  let otherUserId: number;
  let testBookId: number;
  let testReviewId: number;
  let otherUserReviewId: number;

  beforeEach(async () => {
    await createDB();

    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'test@example.com',
          password_hash: 'hashed_password',
          first_name: 'Test',
          last_name: 'User'
        },
        {
          email: 'other@example.com',
          password_hash: 'hashed_password',
          first_name: 'Other',
          last_name: 'User'
        }
      ])
      .returning()
      .execute();

    testUserId = users[0].id;
    otherUserId = users[1].id;

    // Create test book
    const books = await db.insert(booksTable)
      .values({
        title: 'Test Book',
        author: 'Test Author',
        price: '19.99',
        stock_quantity: 10,
        category: 'Fiction'
      })
      .returning()
      .execute();

    testBookId = books[0].id;

    // Create test reviews
    const reviews = await db.insert(reviewsTable)
      .values([
        {
          user_id: testUserId,
          book_id: testBookId,
          rating: 5,
          comment: 'Great book!'
        },
        {
          user_id: otherUserId,
          book_id: testBookId,
          rating: 4,
          comment: 'Good read'
        }
      ])
      .returning()
      .execute();

    testReviewId = reviews[0].id;
    otherUserReviewId = reviews[1].id;
  });

  afterEach(resetDB);

  it('should delete a review when user owns it', async () => {
    const result = await deleteReview(testUserId, testReviewId);

    expect(result).toBe(true);

    // Verify review was actually deleted
    const reviews = await db.select()
      .from(reviewsTable)
      .where(eq(reviewsTable.id, testReviewId))
      .execute();

    expect(reviews).toHaveLength(0);
  });

  it('should return false when review does not exist', async () => {
    const nonExistentReviewId = 99999;
    const result = await deleteReview(testUserId, nonExistentReviewId);

    expect(result).toBe(false);
  });

  it('should return false when user does not own the review', async () => {
    const result = await deleteReview(testUserId, otherUserReviewId);

    expect(result).toBe(false);

    // Verify review still exists
    const reviews = await db.select()
      .from(reviewsTable)
      .where(eq(reviewsTable.id, otherUserReviewId))
      .execute();

    expect(reviews).toHaveLength(1);
    expect(reviews[0].user_id).toBe(otherUserId);
  });

  it('should return false when user tries to delete non-existent review', async () => {
    const nonExistentUserId = 99999;
    const result = await deleteReview(nonExistentUserId, testReviewId);

    expect(result).toBe(false);

    // Verify original review still exists
    const reviews = await db.select()
      .from(reviewsTable)
      .where(eq(reviewsTable.id, testReviewId))
      .execute();

    expect(reviews).toHaveLength(1);
    expect(reviews[0].user_id).toBe(testUserId);
  });

  it('should not affect other reviews when deleting one', async () => {
    // Count total reviews before deletion
    const reviewsBefore = await db.select()
      .from(reviewsTable)
      .execute();

    expect(reviewsBefore).toHaveLength(2);

    // Delete one review
    const result = await deleteReview(testUserId, testReviewId);
    expect(result).toBe(true);

    // Check that only one review remains
    const reviewsAfter = await db.select()
      .from(reviewsTable)
      .execute();

    expect(reviewsAfter).toHaveLength(1);
    expect(reviewsAfter[0].id).toBe(otherUserReviewId);
    expect(reviewsAfter[0].user_id).toBe(otherUserId);
  });
});