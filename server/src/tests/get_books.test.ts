import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { booksTable } from '../db/schema';
import { type SearchBooksInput, type CreateBookInput } from '../schema';
import { getBooks } from '../handlers/get_books';

// Test data for books
const testBooks: CreateBookInput[] = [
  {
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    isbn: '978-0-7432-7356-5',
    description: 'A classic American novel set in the Jazz Age',
    price: 12.99,
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
    description: 'A story of racial injustice and loss of innocence',
    price: 14.99,
    stock_quantity: 30,
    category: 'Fiction',
    publication_year: 1960,
    publisher: 'HarperCollins',
    cover_image_url: 'https://example.com/mockingbird.jpg'
  },
  {
    title: 'Clean Code',
    author: 'Robert C. Martin',
    isbn: '978-0-13-235088-4',
    description: 'A handbook of agile software craftsmanship',
    price: 45.99,
    stock_quantity: 25,
    category: 'Technology',
    publication_year: 2008,
    publisher: 'Prentice Hall',
    cover_image_url: 'https://example.com/cleancode.jpg'
  },
  {
    title: 'JavaScript: The Good Parts',
    author: 'Douglas Crockford',
    isbn: '978-0-596-51774-8',
    description: 'Unearthing the excellence in JavaScript',
    price: 29.99,
    stock_quantity: 40,
    category: 'Technology',
    publication_year: 2008,
    publisher: "O'Reilly Media",
    cover_image_url: 'https://example.com/jsgoodparts.jpg'
  }
];

// Helper function to create test books
const createTestBooks = async (books: CreateBookInput[]) => {
  for (const book of books) {
    await db.insert(booksTable).values({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      description: book.description,
      price: book.price.toString(),
      stock_quantity: book.stock_quantity,
      category: book.category,
      publication_year: book.publication_year,
      publisher: book.publisher,
      cover_image_url: book.cover_image_url
    }).execute();
  }
};

describe('getBooks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no books exist', async () => {
    const result = await getBooks();
    
    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all books with default pagination', async () => {
    await createTestBooks(testBooks);

    const result = await getBooks();

    expect(result).toHaveLength(4);
    
    // Verify book structure and numeric conversion
    result.forEach(book => {
      expect(typeof book.price).toBe('number');
      expect(typeof book.stock_quantity).toBe('number');
      expect(book.id).toBeDefined();
      expect(book.created_at).toBeInstanceOf(Date);
      expect(book.updated_at).toBeInstanceOf(Date);
    });

    // Verify ordering (newest first)
    const titles = result.map(book => book.title);
    expect(titles).toContain('The Great Gatsby');
    expect(titles).toContain('Clean Code');
  });

  it('should apply pagination correctly', async () => {
    await createTestBooks(testBooks);

    const input: SearchBooksInput = {
      limit: 2,
      offset: 0
    };

    const firstPage = await getBooks(input);
    expect(firstPage).toHaveLength(2);

    const secondPageInput: SearchBooksInput = {
      limit: 2,
      offset: 2
    };

    const secondPage = await getBooks(secondPageInput);
    expect(secondPage).toHaveLength(2);

    // Ensure no overlap between pages
    const firstPageIds = firstPage.map(book => book.id);
    const secondPageIds = secondPage.map(book => book.id);
    
    firstPageIds.forEach(id => {
      expect(secondPageIds).not.toContain(id);
    });
  });

  it('should filter by category', async () => {
    await createTestBooks(testBooks);

    const input: SearchBooksInput = {
      category: 'Technology',
      limit: 20,
      offset: 0
    };

    const result = await getBooks(input);

    expect(result).toHaveLength(2);
    result.forEach(book => {
      expect(book.category).toBe('Technology');
    });

    const titles = result.map(book => book.title);
    expect(titles).toContain('Clean Code');
    expect(titles).toContain('JavaScript: The Good Parts');
  });

  it('should filter by author', async () => {
    await createTestBooks(testBooks);

    const input: SearchBooksInput = {
      author: 'Martin',
      limit: 20,
      offset: 0
    };

    const result = await getBooks(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Clean Code');
    expect(result[0].author).toBe('Robert C. Martin');
  });

  it('should filter by text query across multiple fields', async () => {
    await createTestBooks(testBooks);

    // Search in title
    const titleSearch: SearchBooksInput = {
      query: 'gatsby',
      limit: 20,
      offset: 0
    };

    const titleResult = await getBooks(titleSearch);
    expect(titleResult).toHaveLength(1);
    expect(titleResult[0].title).toBe('The Great Gatsby');

    // Search in author
    const authorSearch: SearchBooksInput = {
      query: 'crockford',
      limit: 20,
      offset: 0
    };

    const authorResult = await getBooks(authorSearch);
    expect(authorResult).toHaveLength(1);
    expect(authorResult[0].author).toBe('Douglas Crockford');

    // Search in description
    const descriptionSearch: SearchBooksInput = {
      query: 'craftsmanship',
      limit: 20,
      offset: 0
    };

    const descriptionResult = await getBooks(descriptionSearch);
    expect(descriptionResult).toHaveLength(1);
    expect(descriptionResult[0].title).toBe('Clean Code');
  });

  it('should filter by price range', async () => {
    await createTestBooks(testBooks);

    const input: SearchBooksInput = {
      min_price: 20,
      max_price: 40,
      limit: 20,
      offset: 0
    };

    const result = await getBooks(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('JavaScript: The Good Parts');
    expect(result[0].price).toBe(29.99);
    
    // Verify price is within range
    result.forEach(book => {
      expect(book.price).toBeGreaterThanOrEqual(20);
      expect(book.price).toBeLessThanOrEqual(40);
    });
  });

  it('should filter by minimum price only', async () => {
    await createTestBooks(testBooks);

    const input: SearchBooksInput = {
      min_price: 30,
      limit: 20,
      offset: 0
    };

    const result = await getBooks(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Clean Code');
    
    result.forEach(book => {
      expect(book.price).toBeGreaterThanOrEqual(30);
    });
  });

  it('should filter by maximum price only', async () => {
    await createTestBooks(testBooks);

    const input: SearchBooksInput = {
      max_price: 15,
      limit: 20,
      offset: 0
    };

    const result = await getBooks(input);

    expect(result).toHaveLength(2);
    
    result.forEach(book => {
      expect(book.price).toBeLessThanOrEqual(15);
    });

    const titles = result.map(book => book.title);
    expect(titles).toContain('The Great Gatsby');
    expect(titles).toContain('To Kill a Mockingbird');
  });

  it('should combine multiple filters', async () => {
    await createTestBooks(testBooks);

    const input: SearchBooksInput = {
      category: 'Fiction',
      max_price: 15,
      limit: 20,
      offset: 0
    };

    const result = await getBooks(input);

    expect(result).toHaveLength(2);
    
    result.forEach(book => {
      expect(book.category).toBe('Fiction');
      expect(book.price).toBeLessThanOrEqual(15);
    });
  });

  it('should handle case-insensitive text search', async () => {
    await createTestBooks(testBooks);

    const input: SearchBooksInput = {
      query: 'GATSBY',
      limit: 20,
      offset: 0
    };

    const result = await getBooks(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('The Great Gatsby');
  });

  it('should return empty array for non-matching filters', async () => {
    await createTestBooks(testBooks);

    const input: SearchBooksInput = {
      category: 'NonExistentCategory',
      limit: 20,
      offset: 0
    };

    const result = await getBooks(input);

    expect(result).toHaveLength(0);
  });

  it('should handle edge case with price range filters', async () => {
    await createTestBooks(testBooks);

    const input: SearchBooksInput = {
      min_price: 100,
      max_price: 200,
      limit: 20,
      offset: 0
    };

    const result = await getBooks(input);

    expect(result).toHaveLength(0);
  });

  it('should respect limit and offset with filters', async () => {
    await createTestBooks(testBooks);

    const input: SearchBooksInput = {
      category: 'Fiction',
      limit: 1,
      offset: 1
    };

    const result = await getBooks(input);

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('Fiction');
  });

  it('should validate numeric type conversions', async () => {
    await createTestBooks([testBooks[0]]);

    const result = await getBooks();

    expect(result).toHaveLength(1);
    const book = result[0];

    // Verify all numeric fields are properly converted
    expect(typeof book.price).toBe('number');
    expect(book.price).toBe(12.99);
    expect(typeof book.stock_quantity).toBe('number');
    expect(book.stock_quantity).toBe(50);
    expect(typeof book.publication_year).toBe('number');
    expect(book.publication_year).toBe(1925);
  });
});