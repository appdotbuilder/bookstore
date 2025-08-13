import { db } from '../db';
import { booksTable } from '../db/schema';
import { type CreateBookInput, type Book } from '../schema';

export const createBook = async (input: CreateBookInput): Promise<Book> => {
  try {
    // Insert book record
    const result = await db.insert(booksTable)
      .values({
        title: input.title,
        author: input.author,
        isbn: input.isbn,
        description: input.description,
        price: input.price.toString(), // Convert number to string for numeric column
        stock_quantity: input.stock_quantity,
        category: input.category,
        publication_year: input.publication_year,
        publisher: input.publisher,
        cover_image_url: input.cover_image_url
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const book = result[0];
    return {
      ...book,
      price: parseFloat(book.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Book creation failed:', error);
    throw error;
  }
};