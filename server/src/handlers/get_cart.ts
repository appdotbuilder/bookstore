import { db } from '../db';
import { cartItemsTable, booksTable } from '../db/schema';
import { type CartItem, type Book } from '../schema';
import { eq } from 'drizzle-orm';

// Extended cart item type that includes book details
export type CartItemWithBook = CartItem & {
  book: Book;
};

export const getCart = async (userId: number): Promise<CartItemWithBook[]> => {
  try {
    // Query cart items with book details via join
    const results = await db.select({
      // Cart item fields
      id: cartItemsTable.id,
      user_id: cartItemsTable.user_id,
      book_id: cartItemsTable.book_id,
      quantity: cartItemsTable.quantity,
      created_at: cartItemsTable.created_at,
      updated_at: cartItemsTable.updated_at,
      // Book fields
      book_title: booksTable.title,
      book_author: booksTable.author,
      book_isbn: booksTable.isbn,
      book_description: booksTable.description,
      book_price: booksTable.price,
      book_stock_quantity: booksTable.stock_quantity,
      book_category: booksTable.category,
      book_publication_year: booksTable.publication_year,
      book_publisher: booksTable.publisher,
      book_cover_image_url: booksTable.cover_image_url,
      book_created_at: booksTable.created_at,
      book_updated_at: booksTable.updated_at
    })
      .from(cartItemsTable)
      .innerJoin(booksTable, eq(cartItemsTable.book_id, booksTable.id))
      .where(eq(cartItemsTable.user_id, userId))
      .execute();

    // Transform the results to match the expected structure
    return results.map(result => ({
      id: result.id,
      user_id: result.user_id,
      book_id: result.book_id,
      quantity: result.quantity,
      created_at: result.created_at,
      updated_at: result.updated_at,
      book: {
        id: result.book_id, // Use the book_id from cart item
        title: result.book_title,
        author: result.book_author,
        isbn: result.book_isbn,
        description: result.book_description,
        price: parseFloat(result.book_price), // Convert numeric field to number
        stock_quantity: result.book_stock_quantity,
        category: result.book_category,
        publication_year: result.book_publication_year,
        publisher: result.book_publisher,
        cover_image_url: result.book_cover_image_url,
        created_at: result.book_created_at,
        updated_at: result.book_updated_at
      }
    }));
  } catch (error) {
    console.error('Failed to fetch cart:', error);
    throw error;
  }
};