import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  loginInputSchema,
  createBookInputSchema,
  updateBookInputSchema,
  searchBooksInputSchema,
  addToCartInputSchema,
  updateCartItemInputSchema,
  createOrderInputSchema,
  createReviewInputSchema,
  updateReviewInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { loginUser } from './handlers/login_user';
import { createBook } from './handlers/create_book';
import { updateBook } from './handlers/update_book';
import { getBooks } from './handlers/get_books';
import { getBookById } from './handlers/get_book_by_id';
import { searchBooks } from './handlers/search_books';
import { addToCart } from './handlers/add_to_cart';
import { getCart } from './handlers/get_cart';
import { updateCartItem } from './handlers/update_cart_item';
import { removeFromCart } from './handlers/remove_from_cart';
import { createOrder } from './handlers/create_order';
import { getOrders } from './handlers/get_orders';
import { getOrderById } from './handlers/get_order_by_id';
import { createReview } from './handlers/create_review';
import { getReviews } from './handlers/get_reviews';
import { updateReview } from './handlers/update_review';
import { deleteReview } from './handlers/delete_review';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User authentication routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  loginUser: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  // Book management routes
  createBook: publicProcedure
    .input(createBookInputSchema)
    .mutation(({ input }) => createBook(input)),
  
  updateBook: publicProcedure
    .input(updateBookInputSchema)
    .mutation(({ input }) => updateBook(input)),
  
  getBooks: publicProcedure
    .query(() => getBooks()),
  
  getBookById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getBookById(input.id)),
  
  searchBooks: publicProcedure
    .input(searchBooksInputSchema)
    .query(({ input }) => searchBooks(input)),

  // Shopping cart routes
  addToCart: publicProcedure
    .input(z.object({ userId: z.number() }).merge(addToCartInputSchema))
    .mutation(({ input }) => addToCart(input.userId, { book_id: input.book_id, quantity: input.quantity })),
  
  getCart: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getCart(input.userId)),
  
  updateCartItem: publicProcedure
    .input(z.object({ userId: z.number() }).merge(updateCartItemInputSchema))
    .mutation(({ input }) => updateCartItem(input.userId, { cart_item_id: input.cart_item_id, quantity: input.quantity })),
  
  removeFromCart: publicProcedure
    .input(z.object({ userId: z.number(), cartItemId: z.number() }))
    .mutation(({ input }) => removeFromCart(input.userId, input.cartItemId)),

  // Order management routes
  createOrder: publicProcedure
    .input(z.object({ userId: z.number() }).merge(createOrderInputSchema))
    .mutation(({ input }) => createOrder(input.userId, { shipping_address: input.shipping_address })),
  
  getOrders: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getOrders(input.userId)),
  
  getOrderById: publicProcedure
    .input(z.object({ userId: z.number(), orderId: z.number() }))
    .query(({ input }) => getOrderById(input.userId, input.orderId)),

  // Review routes
  createReview: publicProcedure
    .input(z.object({ userId: z.number() }).merge(createReviewInputSchema))
    .mutation(({ input }) => createReview(input.userId, { book_id: input.book_id, rating: input.rating, comment: input.comment })),
  
  getReviews: publicProcedure
    .input(z.object({ bookId: z.number() }))
    .query(({ input }) => getReviews(input.bookId)),
  
  updateReview: publicProcedure
    .input(z.object({ userId: z.number() }).merge(updateReviewInputSchema))
    .mutation(({ input }) => updateReview(input.userId, { review_id: input.review_id, rating: input.rating, comment: input.comment })),
  
  deleteReview: publicProcedure
    .input(z.object({ userId: z.number(), reviewId: z.number() }))
    .mutation(({ input }) => deleteReview(input.userId, input.reviewId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();