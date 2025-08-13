import { db } from '../db';
import { reviewsTable, usersTable } from '../db/schema';
import { type Review } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getReviews = async (bookId: number): Promise<Review[]> => {
  try {
    // Query reviews with user details via join
    const results = await db.select({
      id: reviewsTable.id,
      user_id: reviewsTable.user_id,
      book_id: reviewsTable.book_id,
      rating: reviewsTable.rating,
      comment: reviewsTable.comment,
      created_at: reviewsTable.created_at,
      updated_at: reviewsTable.updated_at,
      user_first_name: usersTable.first_name,
      user_last_name: usersTable.last_name
    })
    .from(reviewsTable)
    .innerJoin(usersTable, eq(reviewsTable.user_id, usersTable.id))
    .where(eq(reviewsTable.book_id, bookId))
    .orderBy(desc(reviewsTable.created_at))
    .execute();

    // Transform results to include user name while maintaining Review type structure
    return results.map(result => ({
      id: result.id,
      user_id: result.user_id,
      book_id: result.book_id,
      rating: result.rating,
      comment: result.comment,
      created_at: result.created_at,
      updated_at: result.updated_at,
      // Add user name information (this extends the base Review type)
      user_name: `${result.user_first_name} ${result.user_last_name}`
    } as Review & { user_name: string }));
  } catch (error) {
    console.error('Failed to fetch reviews:', error);
    throw error;
  }
};