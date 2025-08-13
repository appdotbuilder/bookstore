import { db } from '../db';
import { booksTable } from '../db/schema';
import { type SearchBooksInput, type Book } from '../schema';
import { and, or, ilike, gte, lte, desc, SQL } from 'drizzle-orm';

export const searchBooks = async (input: SearchBooksInput): Promise<Book[]> => {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    // Text search across title, author, and description
    if (input.query) {
      const searchTerm = `%${input.query}%`;
      conditions.push(
        or(
          ilike(booksTable.title, searchTerm),
          ilike(booksTable.author, searchTerm),
          ilike(booksTable.description, searchTerm)
        )!
      );
    }

    // Category filtering
    if (input.category) {
      conditions.push(ilike(booksTable.category, input.category));
    }

    // Author filtering
    if (input.author) {
      conditions.push(ilike(booksTable.author, `%${input.author}%`));
    }

    // Price range filtering
    if (input.min_price !== undefined) {
      conditions.push(gte(booksTable.price, input.min_price.toString()));
    }

    if (input.max_price !== undefined) {
      conditions.push(lte(booksTable.price, input.max_price.toString()));
    }

    // Build the query conditionally without reassignment
    const results = conditions.length > 0
      ? await db.select()
          .from(booksTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(booksTable.created_at))
          .limit(input.limit)
          .offset(input.offset)
          .execute()
      : await db.select()
          .from(booksTable)
          .orderBy(desc(booksTable.created_at))
          .limit(input.limit)
          .offset(input.offset)
          .execute();

    // Convert numeric fields back to numbers
    return results.map(book => ({
      ...book,
      price: parseFloat(book.price)
    }));
  } catch (error) {
    console.error('Book search failed:', error);
    throw error;
  }
};