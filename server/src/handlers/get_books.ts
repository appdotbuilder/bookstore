import { db } from '../db';
import { booksTable } from '../db/schema';
import { type SearchBooksInput, type Book } from '../schema';
import { eq, gte, lte, ilike, desc, and, or, SQL } from 'drizzle-orm';

export const getBooks = async (input: SearchBooksInput = { limit: 20, offset: 0 }): Promise<Book[]> => {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    // Text search in title, author, and description
    if (input.query) {
      const searchPattern = `%${input.query}%`;
      const textSearchCondition = or(
        ilike(booksTable.title, searchPattern),
        ilike(booksTable.author, searchPattern),
        ilike(booksTable.description, searchPattern)
      );
      if (textSearchCondition) {
        conditions.push(textSearchCondition);
      }
    }

    // Category filter
    if (input.category) {
      conditions.push(eq(booksTable.category, input.category));
    }

    // Author filter (in addition to general text search)
    if (input.author) {
      conditions.push(ilike(booksTable.author, `%${input.author}%`));
    }

    // Price range filters
    if (input.min_price !== undefined) {
      conditions.push(gte(booksTable.price, input.min_price.toString()));
    }

    if (input.max_price !== undefined) {
      conditions.push(lte(booksTable.price, input.max_price.toString()));
    }

    // Build the complete query in one chain
    const baseQuery = db.select().from(booksTable);
    
    let results;
    if (conditions.length > 0) {
      results = await baseQuery
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(desc(booksTable.created_at))
        .limit(input.limit)
        .offset(input.offset)
        .execute();
    } else {
      results = await baseQuery
        .orderBy(desc(booksTable.created_at))
        .limit(input.limit)
        .offset(input.offset)
        .execute();
    }

    // Convert numeric fields back to numbers
    return results.map(book => ({
      ...book,
      price: parseFloat(book.price)
    }));
  } catch (error) {
    console.error('Failed to fetch books:', error);
    throw error;
  }
};