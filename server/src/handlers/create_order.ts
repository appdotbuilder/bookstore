import { db } from '../db';
import { booksTable, cartItemsTable, ordersTable, orderItemsTable } from '../db/schema';
import { type CreateOrderInput, type Order } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createOrder = async (userId: number, input: CreateOrderInput): Promise<Order> => {
  try {
    // Execute the order creation within a transaction to ensure data consistency
    const result = await db.transaction(async (tx) => {
      // 1. Get all cart items for the user with book details
      const cartItemsWithBooks = await tx.select({
        cart_item_id: cartItemsTable.id,
        book_id: cartItemsTable.book_id,
        quantity: cartItemsTable.quantity,
        book_price: booksTable.price,
        book_stock: booksTable.stock_quantity,
        book_title: booksTable.title
      })
      .from(cartItemsTable)
      .innerJoin(booksTable, eq(cartItemsTable.book_id, booksTable.id))
      .where(eq(cartItemsTable.user_id, userId))
      .execute();

      // Check if cart is empty
      if (cartItemsWithBooks.length === 0) {
        throw new Error('Cart is empty');
      }

      // 2. Validate all cart items have sufficient stock
      const insufficientStock = cartItemsWithBooks.filter(item => 
        item.quantity > item.book_stock
      );

      if (insufficientStock.length > 0) {
        const bookTitles = insufficientStock.map(item => item.book_title).join(', ');
        throw new Error(`Insufficient stock for books: ${bookTitles}`);
      }

      // 3. Calculate total amount
      const totalAmount = cartItemsWithBooks.reduce((sum, item) => {
        return sum + (parseFloat(item.book_price) * item.quantity);
      }, 0);

      // 4. Create order record
      const [orderRecord] = await tx.insert(ordersTable)
        .values({
          user_id: userId,
          total_amount: totalAmount.toString(),
          status: 'pending',
          shipping_address: input.shipping_address
        })
        .returning()
        .execute();

      // 5. Create order items from cart items
      const orderItemsData = cartItemsWithBooks.map(item => ({
        order_id: orderRecord.id,
        book_id: item.book_id,
        quantity: item.quantity,
        price_at_time: item.book_price // Keep as string for numeric column
      }));

      await tx.insert(orderItemsTable)
        .values(orderItemsData)
        .execute();

      // 6. Update book stock quantities
      for (const item of cartItemsWithBooks) {
        const newStock = item.book_stock - item.quantity;
        await tx.update(booksTable)
          .set({ stock_quantity: newStock })
          .where(eq(booksTable.id, item.book_id))
          .execute();
      }

      // 7. Clear user's cart
      await tx.delete(cartItemsTable)
        .where(eq(cartItemsTable.user_id, userId))
        .execute();

      return orderRecord;
    });

    // Convert numeric fields back to numbers before returning
    return {
      ...result,
      total_amount: parseFloat(result.total_amount)
    };
  } catch (error) {
    console.error('Order creation failed:', error);
    throw error;
  }
};