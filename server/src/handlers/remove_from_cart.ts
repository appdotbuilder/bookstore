import { db } from '../db';
import { cartItemsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const removeFromCart = async (userId: number, cartItemId: number): Promise<boolean> => {
  try {
    // Delete cart item, ensuring it belongs to the user
    const result = await db.delete(cartItemsTable)
      .where(
        and(
          eq(cartItemsTable.id, cartItemId),
          eq(cartItemsTable.user_id, userId)
        )
      )
      .execute();

    // Return true if a row was deleted, false if no matching item was found
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Remove from cart failed:', error);
    throw error;
  }
};