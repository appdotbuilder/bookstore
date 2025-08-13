import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, booksTable, cartItemsTable } from '../db/schema';
import { getCart, type CartItemWithBook } from '../handlers/get_cart';
import { eq } from 'drizzle-orm';

describe('getCart', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when cart is empty', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const result = await getCart(userId);

    expect(result).toEqual([]);
  });

  it('should return cart items with book details', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const bookResult = await db.insert(booksTable)
      .values({
        title: 'Test Book',
        author: 'Test Author',
        isbn: '978-0123456789',
        description: 'A test book',
        price: '29.99',
        stock_quantity: 10,
        category: 'Fiction',
        publication_year: 2023,
        publisher: 'Test Publisher',
        cover_image_url: 'https://example.com/cover.jpg'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const bookId = bookResult[0].id;

    // Add item to cart
    await db.insert(cartItemsTable)
      .values({
        user_id: userId,
        book_id: bookId,
        quantity: 2
      })
      .execute();

    const result = await getCart(userId);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(userId);
    expect(result[0].book_id).toEqual(bookId);
    expect(result[0].quantity).toEqual(2);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    // Verify book details are included
    expect(result[0].book).toBeDefined();
    expect(result[0].book.id).toEqual(bookId);
    expect(result[0].book.title).toEqual('Test Book');
    expect(result[0].book.author).toEqual('Test Author');
    expect(result[0].book.isbn).toEqual('978-0123456789');
    expect(result[0].book.price).toEqual(29.99);
    expect(typeof result[0].book.price).toEqual('number');
    expect(result[0].book.stock_quantity).toEqual(10);
    expect(result[0].book.category).toEqual('Fiction');
  });

  it('should return multiple cart items for the same user', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const booksResult = await db.insert(booksTable)
      .values([
        {
          title: 'First Book',
          author: 'Author One',
          price: '19.99',
          stock_quantity: 5,
          category: 'Fiction'
        },
        {
          title: 'Second Book',
          author: 'Author Two',
          price: '39.99',
          stock_quantity: 3,
          category: 'Non-Fiction'
        }
      ])
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Add multiple items to cart
    await db.insert(cartItemsTable)
      .values([
        {
          user_id: userId,
          book_id: booksResult[0].id,
          quantity: 1
        },
        {
          user_id: userId,
          book_id: booksResult[1].id,
          quantity: 3
        }
      ])
      .execute();

    const result = await getCart(userId);

    expect(result).toHaveLength(2);
    
    // Sort results by book title for consistent testing
    result.sort((a, b) => a.book.title.localeCompare(b.book.title));

    expect(result[0].book.title).toEqual('First Book');
    expect(result[0].quantity).toEqual(1);
    expect(result[0].book.price).toEqual(19.99);

    expect(result[1].book.title).toEqual('Second Book');
    expect(result[1].quantity).toEqual(3);
    expect(result[1].book.price).toEqual(39.99);
  });

  it('should only return cart items for specified user', async () => {
    // Create two users
    const usersResult = await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          password_hash: 'hashedpassword',
          first_name: 'User',
          last_name: 'One'
        },
        {
          email: 'user2@example.com',
          password_hash: 'hashedpassword',
          first_name: 'User',
          last_name: 'Two'
        }
      ])
      .returning()
      .execute();

    const bookResult = await db.insert(booksTable)
      .values({
        title: 'Shared Book',
        author: 'Test Author',
        price: '25.00',
        stock_quantity: 10,
        category: 'Fiction'
      })
      .returning()
      .execute();

    const user1Id = usersResult[0].id;
    const user2Id = usersResult[1].id;
    const bookId = bookResult[0].id;

    // Add items to both users' carts
    await db.insert(cartItemsTable)
      .values([
        {
          user_id: user1Id,
          book_id: bookId,
          quantity: 1
        },
        {
          user_id: user2Id,
          book_id: bookId,
          quantity: 2
        }
      ])
      .execute();

    // Get cart for user1
    const user1Cart = await getCart(user1Id);
    expect(user1Cart).toHaveLength(1);
    expect(user1Cart[0].user_id).toEqual(user1Id);
    expect(user1Cart[0].quantity).toEqual(1);

    // Get cart for user2
    const user2Cart = await getCart(user2Id);
    expect(user2Cart).toHaveLength(1);
    expect(user2Cart[0].user_id).toEqual(user2Id);
    expect(user2Cart[0].quantity).toEqual(2);
  });

  it('should handle books with nullable fields', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const bookResult = await db.insert(booksTable)
      .values({
        title: 'Minimal Book',
        author: 'Test Author',
        price: '15.50',
        stock_quantity: 1,
        category: 'Mystery',
        // All other nullable fields left as null
        isbn: null,
        description: null,
        publication_year: null,
        publisher: null,
        cover_image_url: null
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const bookId = bookResult[0].id;

    // Add item to cart
    await db.insert(cartItemsTable)
      .values({
        user_id: userId,
        book_id: bookId,
        quantity: 1
      })
      .execute();

    const result = await getCart(userId);

    expect(result).toHaveLength(1);
    expect(result[0].book.title).toEqual('Minimal Book');
    expect(result[0].book.price).toEqual(15.50);
    expect(result[0].book.isbn).toBeNull();
    expect(result[0].book.description).toBeNull();
    expect(result[0].book.publication_year).toBeNull();
    expect(result[0].book.publisher).toBeNull();
    expect(result[0].book.cover_image_url).toBeNull();
  });

  it('should verify cart data is saved correctly in database', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const bookResult = await db.insert(booksTable)
      .values({
        title: 'Database Test Book',
        author: 'DB Author',
        price: '99.99',
        stock_quantity: 20,
        category: 'Technical'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const bookId = bookResult[0].id;

    // Add item to cart
    const cartResult = await db.insert(cartItemsTable)
      .values({
        user_id: userId,
        book_id: bookId,
        quantity: 5
      })
      .returning()
      .execute();

    // Fetch via handler
    const handlerResult = await getCart(userId);

    // Verify database state directly
    const dbCartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.user_id, userId))
      .execute();

    expect(dbCartItems).toHaveLength(1);
    expect(dbCartItems[0].id).toEqual(cartResult[0].id);
    expect(dbCartItems[0].quantity).toEqual(5);

    // Verify handler returns same data
    expect(handlerResult).toHaveLength(1);
    expect(handlerResult[0].id).toEqual(cartResult[0].id);
    expect(handlerResult[0].quantity).toEqual(5);
    expect(handlerResult[0].book.title).toEqual('Database Test Book');
  });

  it('should handle numeric price conversion correctly', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const bookResult = await db.insert(booksTable)
      .values({
        title: 'Price Test Book',
        author: 'Price Author',
        price: '123.45',
        stock_quantity: 1,
        category: 'Test'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const bookId = bookResult[0].id;

    // Add item to cart
    await db.insert(cartItemsTable)
      .values({
        user_id: userId,
        book_id: bookId,
        quantity: 1
      })
      .execute();

    const result = await getCart(userId);

    expect(result).toHaveLength(1);
    expect(typeof result[0].book.price).toEqual('number');
    expect(result[0].book.price).toEqual(123.45);
  });
});