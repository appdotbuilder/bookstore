import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { booksTable } from '../db/schema';
import { type CreateBookInput } from '../schema';
import { getBookById } from '../handlers/get_book_by_id';

// Test book data
const testBook: CreateBookInput = {
  title: 'The Great Gatsby',
  author: 'F. Scott Fitzgerald',
  isbn: '978-0-7432-7356-5',
  description: 'A classic American novel',
  price: 15.99,
  stock_quantity: 50,
  category: 'Fiction',
  publication_year: 1925,
  publisher: 'Scribner',
  cover_image_url: 'https://example.com/gatsby.jpg'
};

describe('getBookById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a book when found', async () => {
    // Create test book
    const insertResult = await db.insert(booksTable)
      .values({
        ...testBook,
        price: testBook.price.toString() // Convert number to string for numeric column
      })
      .returning()
      .execute();

    const createdBook = insertResult[0];

    // Fetch the book by ID
    const result = await getBookById(createdBook.id);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdBook.id);
    expect(result!.title).toEqual('The Great Gatsby');
    expect(result!.author).toEqual('F. Scott Fitzgerald');
    expect(result!.isbn).toEqual('978-0-7432-7356-5');
    expect(result!.description).toEqual('A classic American novel');
    expect(result!.price).toEqual(15.99);
    expect(typeof result!.price).toBe('number'); // Verify numeric conversion
    expect(result!.stock_quantity).toEqual(50);
    expect(result!.category).toEqual('Fiction');
    expect(result!.publication_year).toEqual(1925);
    expect(result!.publisher).toEqual('Scribner');
    expect(result!.cover_image_url).toEqual('https://example.com/gatsby.jpg');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when book is not found', async () => {
    // Try to fetch a non-existent book
    const result = await getBookById(9999);

    expect(result).toBeNull();
  });

  it('should handle books with nullable fields', async () => {
    // Create book with minimal required fields
    const minimalBook = {
      title: 'Minimal Book',
      author: 'Unknown Author',
      isbn: null,
      description: null,
      price: '9.99', // String for database
      stock_quantity: 10,
      category: 'General',
      publication_year: null,
      publisher: null,
      cover_image_url: null
    };

    const insertResult = await db.insert(booksTable)
      .values(minimalBook)
      .returning()
      .execute();

    const createdBook = insertResult[0];

    // Fetch the book
    const result = await getBookById(createdBook.id);

    // Verify nullable fields are handled correctly
    expect(result).not.toBeNull();
    expect(result!.title).toEqual('Minimal Book');
    expect(result!.author).toEqual('Unknown Author');
    expect(result!.isbn).toBeNull();
    expect(result!.description).toBeNull();
    expect(result!.price).toEqual(9.99); // Converted to number
    expect(typeof result!.price).toBe('number');
    expect(result!.publication_year).toBeNull();
    expect(result!.publisher).toBeNull();
    expect(result!.cover_image_url).toBeNull();
  });

  it('should handle different price formats correctly', async () => {
    // Create book with decimal price
    const bookWithDecimal = {
      title: 'Decimal Price Book',
      author: 'Test Author',
      isbn: null,
      description: null,
      price: '29.95', // String with decimal
      stock_quantity: 5,
      category: 'Test',
      publication_year: null,
      publisher: null,
      cover_image_url: null
    };

    const insertResult = await db.insert(booksTable)
      .values(bookWithDecimal)
      .returning()
      .execute();

    const createdBook = insertResult[0];

    // Fetch and verify price conversion
    const result = await getBookById(createdBook.id);

    expect(result).not.toBeNull();
    expect(result!.price).toEqual(29.95);
    expect(typeof result!.price).toBe('number');
  });
});