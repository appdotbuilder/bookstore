import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { booksTable } from '../db/schema';
import { type CreateBookInput } from '../schema';
import { createBook } from '../handlers/create_book';
import { eq } from 'drizzle-orm';

// Test input with all fields
const fullTestInput: CreateBookInput = {
  title: 'The Great Gatsby',
  author: 'F. Scott Fitzgerald',
  isbn: '9780141182636',
  description: 'A classic American novel about the Jazz Age',
  price: 12.99,
  stock_quantity: 50,
  category: 'Fiction',
  publication_year: 1925,
  publisher: 'Charles Scribners Sons',
  cover_image_url: 'https://example.com/gatsby-cover.jpg'
};

// Test input with minimal required fields
const minimalTestInput: CreateBookInput = {
  title: 'Simple Book',
  author: 'Unknown Author',
  isbn: null,
  description: null,
  price: 9.99,
  stock_quantity: 10,
  category: 'General',
  publication_year: null,
  publisher: null,
  cover_image_url: null
};

describe('createBook', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a book with all fields', async () => {
    const result = await createBook(fullTestInput);

    // Verify all field values
    expect(result.title).toEqual('The Great Gatsby');
    expect(result.author).toEqual('F. Scott Fitzgerald');
    expect(result.isbn).toEqual('9780141182636');
    expect(result.description).toEqual('A classic American novel about the Jazz Age');
    expect(result.price).toEqual(12.99);
    expect(typeof result.price).toBe('number'); // Verify numeric conversion
    expect(result.stock_quantity).toEqual(50);
    expect(result.category).toEqual('Fiction');
    expect(result.publication_year).toEqual(1925);
    expect(result.publisher).toEqual('Charles Scribners Sons');
    expect(result.cover_image_url).toEqual('https://example.com/gatsby-cover.jpg');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a book with minimal required fields', async () => {
    const result = await createBook(minimalTestInput);

    // Verify required fields
    expect(result.title).toEqual('Simple Book');
    expect(result.author).toEqual('Unknown Author');
    expect(result.price).toEqual(9.99);
    expect(typeof result.price).toBe('number'); // Verify numeric conversion
    expect(result.stock_quantity).toEqual(10);
    expect(result.category).toEqual('General');
    
    // Verify nullable fields
    expect(result.isbn).toBeNull();
    expect(result.description).toBeNull();
    expect(result.publication_year).toBeNull();
    expect(result.publisher).toBeNull();
    expect(result.cover_image_url).toBeNull();
    
    // Verify auto-generated fields
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save book to database correctly', async () => {
    const result = await createBook(fullTestInput);

    // Query database to verify persistence
    const books = await db.select()
      .from(booksTable)
      .where(eq(booksTable.id, result.id))
      .execute();

    expect(books).toHaveLength(1);
    const savedBook = books[0];
    
    expect(savedBook.title).toEqual('The Great Gatsby');
    expect(savedBook.author).toEqual('F. Scott Fitzgerald');
    expect(savedBook.isbn).toEqual('9780141182636');
    expect(savedBook.description).toEqual('A classic American novel about the Jazz Age');
    expect(parseFloat(savedBook.price)).toEqual(12.99); // Database stores as string
    expect(savedBook.stock_quantity).toEqual(50);
    expect(savedBook.category).toEqual('Fiction');
    expect(savedBook.publication_year).toEqual(1925);
    expect(savedBook.publisher).toEqual('Charles Scribners Sons');
    expect(savedBook.cover_image_url).toEqual('https://example.com/gatsby-cover.jpg');
    expect(savedBook.created_at).toBeInstanceOf(Date);
    expect(savedBook.updated_at).toBeInstanceOf(Date);
  });

  it('should handle price with different decimal places', async () => {
    const priceTestInput: CreateBookInput = {
      ...minimalTestInput,
      title: 'Price Test Book',
      price: 15.5 // Single decimal place
    };

    const result = await createBook(priceTestInput);

    expect(result.price).toEqual(15.5);
    expect(typeof result.price).toBe('number');

    // Verify in database
    const books = await db.select()
      .from(booksTable)
      .where(eq(booksTable.id, result.id))
      .execute();

    expect(parseFloat(books[0].price)).toEqual(15.5);
  });

  it('should create multiple books with unique IDs', async () => {
    const book1 = await createBook({
      ...minimalTestInput,
      title: 'Book One'
    });

    const book2 = await createBook({
      ...minimalTestInput,
      title: 'Book Two'
    });

    // Verify both books have unique IDs
    expect(book1.id).not.toEqual(book2.id);
    expect(book1.title).toEqual('Book One');
    expect(book2.title).toEqual('Book Two');

    // Verify both are in database
    const allBooks = await db.select().from(booksTable).execute();
    expect(allBooks).toHaveLength(2);
  });

  it('should handle zero stock quantity', async () => {
    const zeroStockInput: CreateBookInput = {
      ...minimalTestInput,
      title: 'Out of Stock Book',
      stock_quantity: 0
    };

    const result = await createBook(zeroStockInput);

    expect(result.stock_quantity).toEqual(0);
    expect(result.title).toEqual('Out of Stock Book');
  });
});