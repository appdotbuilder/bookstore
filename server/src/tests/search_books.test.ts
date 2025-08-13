import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { booksTable } from '../db/schema';
import { type SearchBooksInput } from '../schema';
import { searchBooks } from '../handlers/search_books';

// Test data
const testBooks = [
  {
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    isbn: '978-0-7432-7356-5',
    description: 'A classic American novel about the Jazz Age',
    price: '15.99',
    stock_quantity: 50,
    category: 'Fiction',
    publication_year: 1925,
    publisher: 'Scribner',
    cover_image_url: 'https://example.com/gatsby.jpg'
  },
  {
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    isbn: '978-0-06-112008-4',
    description: 'A novel about racial injustice in the American South',
    price: '12.50',
    stock_quantity: 30,
    category: 'Fiction',
    publication_year: 1960,
    publisher: 'J.B. Lippincott & Co.',
    cover_image_url: 'https://example.com/mockingbird.jpg'
  },
  {
    title: 'JavaScript: The Good Parts',
    author: 'Douglas Crockford',
    isbn: '978-0-596-51774-8',
    description: 'Essential JavaScript programming techniques',
    price: '29.99',
    stock_quantity: 20,
    category: 'Technology',
    publication_year: 2008,
    publisher: 'O\'Reilly Media',
    cover_image_url: 'https://example.com/javascript.jpg'
  },
  {
    title: 'The Art of War',
    author: 'Sun Tzu',
    isbn: null,
    description: 'Ancient Chinese military treatise',
    price: '8.99',
    stock_quantity: 100,
    category: 'Philosophy',
    publication_year: null,
    publisher: null,
    cover_image_url: null
  }
];

describe('searchBooks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  beforeEach(async () => {
    // Insert test books
    await db.insert(booksTable).values(testBooks).execute();
  });

  it('should return all books when no filters applied', async () => {
    const input: SearchBooksInput = {
      limit: 20,
      offset: 0
    };

    const result = await searchBooks(input);

    expect(result).toHaveLength(4);
    
    // Check that all books are returned (don't assume specific order due to timing)
    const titles = result.map(book => book.title);
    expect(titles).toContain('The Great Gatsby');
    expect(titles).toContain('To Kill a Mockingbird');
    expect(titles).toContain('JavaScript: The Good Parts');
    expect(titles).toContain('The Art of War');
    
    // Verify numeric conversion
    result.forEach(book => {
      expect(typeof book.price).toBe('number');
    });
  });

  it('should search by title query', async () => {
    const input: SearchBooksInput = {
      query: 'gatsby',
      limit: 20,
      offset: 0
    };

    const result = await searchBooks(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('The Great Gatsby');
    expect(result[0].price).toEqual(15.99);
  });

  it('should search by author query', async () => {
    const input: SearchBooksInput = {
      query: 'harper',
      limit: 20,
      offset: 0
    };

    const result = await searchBooks(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('To Kill a Mockingbird');
    expect(result[0].author).toEqual('Harper Lee');
  });

  it('should search by description query', async () => {
    const input: SearchBooksInput = {
      query: 'javascript',
      limit: 20,
      offset: 0
    };

    const result = await searchBooks(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('JavaScript: The Good Parts');
    expect(result[0].description).toContain('JavaScript');
  });

  it('should filter by category', async () => {
    const input: SearchBooksInput = {
      category: 'Fiction',
      limit: 20,
      offset: 0
    };

    const result = await searchBooks(input);

    expect(result).toHaveLength(2);
    expect(result.every(book => book.category === 'Fiction')).toBe(true);
  });

  it('should filter by author', async () => {
    const input: SearchBooksInput = {
      author: 'fitzgerald',
      limit: 20,
      offset: 0
    };

    const result = await searchBooks(input);

    expect(result).toHaveLength(1);
    expect(result[0].author).toEqual('F. Scott Fitzgerald');
  });

  it('should filter by minimum price', async () => {
    const input: SearchBooksInput = {
      min_price: 15,
      limit: 20,
      offset: 0
    };

    const result = await searchBooks(input);

    expect(result).toHaveLength(2);
    expect(result.every(book => book.price >= 15)).toBe(true);
  });

  it('should filter by maximum price', async () => {
    const input: SearchBooksInput = {
      max_price: 15,
      limit: 20,
      offset: 0
    };

    const result = await searchBooks(input);

    expect(result).toHaveLength(2); // Should be 2: Art of War (8.99) and Mockingbird (12.50)
    expect(result.every(book => book.price <= 15)).toBe(true);
    
    // Verify which books are included
    const titles = result.map(book => book.title);
    expect(titles).toContain('The Art of War');
    expect(titles).toContain('To Kill a Mockingbird');
  });

  it('should filter by price range', async () => {
    const input: SearchBooksInput = {
      min_price: 10,
      max_price: 20,
      limit: 20,
      offset: 0
    };

    const result = await searchBooks(input);

    expect(result).toHaveLength(2);
    expect(result.every(book => book.price >= 10 && book.price <= 20)).toBe(true);
  });

  it('should combine multiple filters', async () => {
    const input: SearchBooksInput = {
      query: 'novel',
      category: 'Fiction',
      max_price: 20,
      limit: 20,
      offset: 0
    };

    const result = await searchBooks(input);

    expect(result).toHaveLength(2);
    expect(result.every(book => 
      book.category === 'Fiction' && 
      book.price <= 20 &&
      (book.title.toLowerCase().includes('novel') || 
       book.description?.toLowerCase().includes('novel'))
    )).toBe(true);
  });

  it('should handle pagination with limit', async () => {
    const input: SearchBooksInput = {
      limit: 2,
      offset: 0
    };

    const result = await searchBooks(input);

    expect(result).toHaveLength(2);
  });

  it('should handle pagination with offset', async () => {
    const input: SearchBooksInput = {
      limit: 2,
      offset: 2
    };

    const result = await searchBooks(input);

    expect(result).toHaveLength(2);
  });

  it('should return empty array when no matches found', async () => {
    const input: SearchBooksInput = {
      query: 'nonexistent book title',
      limit: 20,
      offset: 0
    };

    const result = await searchBooks(input);

    expect(result).toHaveLength(0);
  });

  it('should be case insensitive in searches', async () => {
    const input: SearchBooksInput = {
      query: 'GATSBY',
      limit: 20,
      offset: 0
    };

    const result = await searchBooks(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('The Great Gatsby');
  });

  it('should handle partial matches in author filter', async () => {
    const input: SearchBooksInput = {
      author: 'Crock',
      limit: 20,
      offset: 0
    };

    const result = await searchBooks(input);

    expect(result).toHaveLength(1);
    expect(result[0].author).toEqual('Douglas Crockford');
  });

  it('should handle books with null values', async () => {
    const input: SearchBooksInput = {
      category: 'Philosophy',
      limit: 20,
      offset: 0
    };

    const result = await searchBooks(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('The Art of War');
    expect(result[0].isbn).toBeNull();
    expect(result[0].publication_year).toBeNull();
    expect(result[0].publisher).toBeNull();
    expect(result[0].cover_image_url).toBeNull();
  });
});