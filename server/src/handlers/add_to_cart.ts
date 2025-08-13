import { db } from '../db';
import { cartItemsTable, booksTable } from '../db/schema';
import { type AddToCartInput, type CartItem } from '../schema';
import { eq, and } from 'drizzle-orm';

export const addToCart = async (userId: number, input: AddToCartInput): Promise<CartItem> => {
  try {
    // First, verify the book exists and has sufficient stock
    const books = await db.select()
      .from(booksTable)
      .where(eq(booksTable.id, input.book_id))
      .execute();

    if (books.length === 0) {
      throw new Error(`Book with id ${input.book_id} not found`);
    }

    const book = books[0];
    if (book.stock_quantity < input.quantity) {
      throw new Error(`Insufficient stock. Available: ${book.stock_quantity}, Requested: ${input.quantity}`);
    }

    // Check if item already exists in cart
    const existingItems = await db.select()
      .from(cartItemsTable)
      .where(and(
        eq(cartItemsTable.user_id, userId),
        eq(cartItemsTable.book_id, input.book_id)
      ))
      .execute();

    if (existingItems.length > 0) {
      // Update existing cart item quantity
      const existingItem = existingItems[0];
      const newQuantity = existingItem.quantity + input.quantity;

      // Check if total quantity exceeds stock
      if (newQuantity > book.stock_quantity) {
        throw new Error(`Total quantity would exceed available stock. Available: ${book.stock_quantity}, Current in cart: ${existingItem.quantity}, Requested additional: ${input.quantity}`);
      }

      const updatedResults = await db.update(cartItemsTable)
        .set({ 
          quantity: newQuantity,
          updated_at: new Date()
        })
        .where(eq(cartItemsTable.id, existingItem.id))
        .returning()
        .execute();

      return updatedResults[0];
    } else {
      // Insert new cart item
      const insertResults = await db.insert(cartItemsTable)
        .values({
          user_id: userId,
          book_id: input.book_id,
          quantity: input.quantity
        })
        .returning()
        .execute();

      return insertResults[0];
    }
  } catch (error) {
    console.error('Add to cart failed:', error);
    throw error;
  }
};