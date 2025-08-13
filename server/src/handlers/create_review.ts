import { db } from '../db';
import { booksTable, reviewsTable, ordersTable, orderItemsTable } from '../db/schema';
import { type CreateReviewInput, type Review } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createReview = async (userId: number, input: CreateReviewInput): Promise<Review> => {
  try {
    // 1. Validate book exists
    const bookExists = await db.select()
      .from(booksTable)
      .where(eq(booksTable.id, input.book_id))
      .execute();
    
    if (bookExists.length === 0) {
      throw new Error('Book not found');
    }

    // 2. Check if user has purchased this book (has an order with this book)
    const userPurchase = await db.select()
      .from(orderItemsTable)
      .innerJoin(ordersTable, eq(orderItemsTable.order_id, ordersTable.id))
      .where(
        and(
          eq(ordersTable.user_id, userId),
          eq(orderItemsTable.book_id, input.book_id)
        )
      )
      .execute();

    if (userPurchase.length === 0) {
      throw new Error('User must purchase the book before reviewing it');
    }

    // 3. Check if user has already reviewed this book
    const existingReview = await db.select()
      .from(reviewsTable)
      .where(
        and(
          eq(reviewsTable.user_id, userId),
          eq(reviewsTable.book_id, input.book_id)
        )
      )
      .execute();

    if (existingReview.length > 0) {
      throw new Error('User has already reviewed this book');
    }

    // 4. Create the review
    const result = await db.insert(reviewsTable)
      .values({
        user_id: userId,
        book_id: input.book_id,
        rating: input.rating,
        comment: input.comment
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Review creation failed:', error);
    throw error;
  }
};