import { db } from '../db';
import { reviewsTable } from '../db/schema';
import { type UpdateReviewInput, type Review } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateReview = async (userId: number, input: UpdateReviewInput): Promise<Review> => {
  try {
    // First, verify the review exists and belongs to the user
    const existingReviews = await db.select()
      .from(reviewsTable)
      .where(and(
        eq(reviewsTable.id, input.review_id),
        eq(reviewsTable.user_id, userId)
      ))
      .execute();

    if (existingReviews.length === 0) {
      throw new Error('Review not found or access denied');
    }

    const existingReview = existingReviews[0];

    // Build update object with only provided fields
    const updateData: Partial<typeof reviewsTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.rating !== undefined) {
      updateData.rating = input.rating;
    }

    if (input.comment !== undefined) {
      updateData.comment = input.comment;
    }

    // Update the review
    const result = await db.update(reviewsTable)
      .set(updateData)
      .where(and(
        eq(reviewsTable.id, input.review_id),
        eq(reviewsTable.user_id, userId)
      ))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Failed to update review');
    }

    const updatedReview = result[0];

    // Return the review with proper type conversion
    return {
      ...updatedReview,
      created_at: updatedReview.created_at,
      updated_at: updatedReview.updated_at
    };
  } catch (error) {
    console.error('Review update failed:', error);
    throw error;
  }
};