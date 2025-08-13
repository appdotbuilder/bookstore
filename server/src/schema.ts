import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Input schema for user registration
export const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string().min(1),
  last_name: z.string().min(1)
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Input schema for user login
export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Book schema
export const bookSchema = z.object({
  id: z.number(),
  title: z.string(),
  author: z.string(),
  isbn: z.string().nullable(),
  description: z.string().nullable(),
  price: z.number(),
  stock_quantity: z.number().int(),
  category: z.string(),
  publication_year: z.number().int().nullable(),
  publisher: z.string().nullable(),
  cover_image_url: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Book = z.infer<typeof bookSchema>;

// Input schema for creating books
export const createBookInputSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  isbn: z.string().nullable(),
  description: z.string().nullable(),
  price: z.number().positive(),
  stock_quantity: z.number().int().nonnegative(),
  category: z.string().min(1),
  publication_year: z.number().int().min(1000).max(new Date().getFullYear()).nullable(),
  publisher: z.string().nullable(),
  cover_image_url: z.string().url().nullable()
});

export type CreateBookInput = z.infer<typeof createBookInputSchema>;

// Input schema for updating books
export const updateBookInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  author: z.string().min(1).optional(),
  isbn: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  price: z.number().positive().optional(),
  stock_quantity: z.number().int().nonnegative().optional(),
  category: z.string().min(1).optional(),
  publication_year: z.number().int().min(1000).max(new Date().getFullYear()).nullable().optional(),
  publisher: z.string().nullable().optional(),
  cover_image_url: z.string().url().nullable().optional()
});

export type UpdateBookInput = z.infer<typeof updateBookInputSchema>;

// Search input schema
export const searchBooksInputSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  author: z.string().optional(),
  min_price: z.number().nonnegative().optional(),
  max_price: z.number().nonnegative().optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0)
});

export type SearchBooksInput = z.infer<typeof searchBooksInputSchema>;

// Cart item schema
export const cartItemSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  book_id: z.number(),
  quantity: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type CartItem = z.infer<typeof cartItemSchema>;

// Input schema for adding items to cart
export const addToCartInputSchema = z.object({
  book_id: z.number(),
  quantity: z.number().int().positive()
});

export type AddToCartInput = z.infer<typeof addToCartInputSchema>;

// Input schema for updating cart items
export const updateCartItemInputSchema = z.object({
  cart_item_id: z.number(),
  quantity: z.number().int().positive()
});

export type UpdateCartItemInput = z.infer<typeof updateCartItemInputSchema>;

// Order status enum
export const orderStatusSchema = z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

// Order schema
export const orderSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  total_amount: z.number(),
  status: orderStatusSchema,
  shipping_address: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Order = z.infer<typeof orderSchema>;

// Order item schema
export const orderItemSchema = z.object({
  id: z.number(),
  order_id: z.number(),
  book_id: z.number(),
  quantity: z.number().int(),
  price_at_time: z.number(),
  created_at: z.coerce.date()
});

export type OrderItem = z.infer<typeof orderItemSchema>;

// Input schema for creating orders
export const createOrderInputSchema = z.object({
  shipping_address: z.string().min(10)
});

export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

// Review schema
export const reviewSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  book_id: z.number(),
  rating: z.number().int(),
  comment: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Review = z.infer<typeof reviewSchema>;

// Input schema for creating reviews
export const createReviewInputSchema = z.object({
  book_id: z.number(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable()
});

export type CreateReviewInput = z.infer<typeof createReviewInputSchema>;

// Input schema for updating reviews
export const updateReviewInputSchema = z.object({
  review_id: z.number(),
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().nullable().optional()
});

export type UpdateReviewInput = z.infer<typeof updateReviewInputSchema>;