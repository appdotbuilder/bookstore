import { db } from '../db';
import { booksTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Book } from '../schema';

export const getBookById = async (id: number): Promise<Book | null> => {
  try {
    // Query the book by ID
    const result = await db.select()
      .from(booksTable)
      .where(eq(booksTable.id, id))
      .execute();

    // Return null if no book found
    if (result.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers before returning
    const book = result[0];
    return {
      ...book,
      price: parseFloat(book.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Failed to fetch book by ID:', error);
    throw error;
  }
};