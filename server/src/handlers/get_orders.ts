import { db } from '../db';
import { ordersTable, orderItemsTable, booksTable } from '../db/schema';
import { type Order } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getOrders = async (userId: number): Promise<Order[]> => {
  try {
    // Query orders with order items and book details via joins
    const results = await db.select({
      // Order fields
      id: ordersTable.id,
      user_id: ordersTable.user_id,
      total_amount: ordersTable.total_amount,
      status: ordersTable.status,
      shipping_address: ordersTable.shipping_address,
      created_at: ordersTable.created_at,
      updated_at: ordersTable.updated_at,
      // Order item fields
      order_item_id: orderItemsTable.id,
      book_id: orderItemsTable.book_id,
      quantity: orderItemsTable.quantity,
      price_at_time: orderItemsTable.price_at_time,
      // Book fields
      book_title: booksTable.title,
      book_author: booksTable.author,
      book_isbn: booksTable.isbn,
      book_cover_image_url: booksTable.cover_image_url
    })
    .from(ordersTable)
    .leftJoin(orderItemsTable, eq(ordersTable.id, orderItemsTable.order_id))
    .leftJoin(booksTable, eq(orderItemsTable.book_id, booksTable.id))
    .where(eq(ordersTable.user_id, userId))
    .orderBy(desc(ordersTable.created_at))
    .execute();

    // Group results by order ID to aggregate order items
    const ordersMap = new Map<number, Order & { order_items: any[] }>();

    for (const row of results) {
      if (!ordersMap.has(row.id)) {
        // Create new order entry
        ordersMap.set(row.id, {
          id: row.id,
          user_id: row.user_id,
          total_amount: parseFloat(row.total_amount), // Convert numeric to number
          status: row.status,
          shipping_address: row.shipping_address,
          created_at: row.created_at,
          updated_at: row.updated_at,
          order_items: []
        });
      }

      // Add order item if it exists (left join may return null for orders without items)
      if (row.order_item_id) {
        const order = ordersMap.get(row.id)!;
        order.order_items.push({
          id: row.order_item_id,
          order_id: row.id,
          book_id: row.book_id,
          quantity: row.quantity,
          price_at_time: parseFloat(row.price_at_time!), // Convert numeric to number
          book: {
            id: row.book_id,
            title: row.book_title,
            author: row.book_author,
            isbn: row.book_isbn,
            cover_image_url: row.book_cover_image_url
          }
        });
      }
    }

    // Convert map values to array and return as Order[] (without order_items for type compliance)
    return Array.from(ordersMap.values()).map(order => ({
      id: order.id,
      user_id: order.user_id,
      total_amount: order.total_amount,
      status: order.status,
      shipping_address: order.shipping_address,
      created_at: order.created_at,
      updated_at: order.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    throw error;
  }
};