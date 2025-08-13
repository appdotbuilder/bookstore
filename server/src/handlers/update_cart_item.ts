import { db } from '../db';
import { cartItemsTable, booksTable } from '../db/schema';
import { type UpdateCartItemInput, type CartItem } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateCartItem = async (userId: number, input: UpdateCartItemInput): Promise<CartItem> => {
  try {
    // First, verify the cart item exists and belongs to the user
    const existingCartItems = await db.select()
      .from(cartItemsTable)
      .where(and(
        eq(cartItemsTable.id, input.cart_item_id),
        eq(cartItemsTable.user_id, userId)
      ))
      .execute();

    if (existingCartItems.length === 0) {
      throw new Error('Cart item not found or does not belong to user');
    }

    const existingItem = existingCartItems[0];

    // Verify the book still exists and has sufficient stock
    const books = await db.select()
      .from(booksTable)
      .where(eq(booksTable.id, existingItem.book_id))
      .execute();

    if (books.length === 0) {
      throw new Error('Book not found');
    }

    const book = books[0];
    if (book.stock_quantity < input.quantity) {
      throw new Error(`Insufficient stock. Available: ${book.stock_quantity}, requested: ${input.quantity}`);
    }

    // Update the cart item with new quantity
    const result = await db.update(cartItemsTable)
      .set({
        quantity: input.quantity,
        updated_at: new Date()
      })
      .where(eq(cartItemsTable.id, input.cart_item_id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Cart item update failed:', error);
    throw error;
  }
};