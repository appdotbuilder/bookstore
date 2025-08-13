import { db } from '../db';
import { ordersTable } from '../db/schema';
import { type Order } from '../schema';
import { eq, and } from 'drizzle-orm';

export const getOrderById = async (userId: number, orderId: number): Promise<Order | null> => {
  try {
    // Query for the order with user verification
    const results = await db.select()
      .from(ordersTable)
      .where(and(
        eq(ordersTable.id, orderId),
        eq(ordersTable.user_id, userId)
      ))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const order = results[0];

    // Convert numeric fields back to numbers before returning
    return {
      ...order,
      total_amount: parseFloat(order.total_amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Get order by ID failed:', error);
    throw error;
  }
};