import { db } from '../db';
import { reviewsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const deleteReview = async (userId: number, reviewId: number): Promise<boolean> => {
  try {
    // Delete review only if it belongs to the user
    const result = await db.delete(reviewsTable)
      .where(and(
        eq(reviewsTable.id, reviewId),
        eq(reviewsTable.user_id, userId)
      ))
      .returning()
      .execute();

    // Return true if a review was deleted, false if no matching review found
    return result.length > 0;
  } catch (error) {
    console.error('Review deletion failed:', error);
    throw error;
  }
};