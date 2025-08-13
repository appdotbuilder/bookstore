import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { booksTable } from '../db/schema';
import { type UpdateBookInput, type CreateBookInput } from '../schema';
import { updateBook } from '../handlers/update_book';
import { eq } from 'drizzle-orm';

// Test book data for creating initial records
const testBook: CreateBookInput = {
  title: 'Original Title',
  author: 'Original Author',
  isbn: '1234567890',
  description: 'Original description',
  price: 25.99,
  stock_quantity: 50,
  category: 'Fiction',
  publication_year: 2020,
  publisher: 'Original Publisher',
  cover_image_url: 'https://example.com/original.jpg'
};

// Helper function to create a test book
const createTestBook = async (bookData: CreateBookInput) => {
  const result = await db.insert(booksTable)
    .values({
      ...bookData,
      price: bookData.price.toString() // Convert to string for database
    })
    .returning()
    .execute();
  
  return {
    ...result[0],
    price: parseFloat(result[0].price) // Convert back to number
  };
};

describe('updateBook', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a book with all fields', async () => {
    // Create a test book first
    const createdBook = await createTestBook(testBook);

    const updateInput: UpdateBookInput = {
      id: createdBook.id,
      title: 'Updated Title',
      author: 'Updated Author',
      isbn: '0987654321',
      description: 'Updated description',
      price: 35.99,
      stock_quantity: 75,
      category: 'Non-Fiction',
      publication_year: 2023,
      publisher: 'Updated Publisher',
      cover_image_url: 'https://example.com/updated.jpg'
    };

    const result = await updateBook(updateInput);

    // Verify all fields are updated
    expect(result.id).toEqual(createdBook.id);
    expect(result.title).toEqual('Updated Title');
    expect(result.author).toEqual('Updated Author');
    expect(result.isbn).toEqual('0987654321');
    expect(result.description).toEqual('Updated description');
    expect(result.price).toEqual(35.99);
    expect(typeof result.price).toBe('number');
    expect(result.stock_quantity).toEqual(75);
    expect(result.category).toEqual('Non-Fiction');
    expect(result.publication_year).toEqual(2023);
    expect(result.publisher).toEqual('Updated Publisher');
    expect(result.cover_image_url).toEqual('https://example.com/updated.jpg');
    
    // Verify timestamps
    expect(result.created_at).toEqual(createdBook.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > createdBook.updated_at).toBe(true);
  });

  it('should update only provided fields and preserve others', async () => {
    // Create a test book first
    const createdBook = await createTestBook(testBook);

    const updateInput: UpdateBookInput = {
      id: createdBook.id,
      title: 'Partially Updated Title',
      price: 30.50
      // Only updating title and price
    };

    const result = await updateBook(updateInput);

    // Verify updated fields
    expect(result.title).toEqual('Partially Updated Title');
    expect(result.price).toEqual(30.50);
    expect(typeof result.price).toBe('number');
    
    // Verify preserved fields
    expect(result.author).toEqual(testBook.author);
    expect(result.isbn).toEqual(testBook.isbn);
    expect(result.description).toEqual(testBook.description);
    expect(result.stock_quantity).toEqual(testBook.stock_quantity);
    expect(result.category).toEqual(testBook.category);
    expect(result.publication_year).toEqual(testBook.publication_year);
    expect(result.publisher).toEqual(testBook.publisher);
    expect(result.cover_image_url).toEqual(testBook.cover_image_url);

    // Verify timestamps
    expect(result.created_at).toEqual(createdBook.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > createdBook.updated_at).toBe(true);
  });

  it('should handle nullable fields correctly', async () => {
    // Create a test book first
    const createdBook = await createTestBook(testBook);

    const updateInput: UpdateBookInput = {
      id: createdBook.id,
      isbn: null,
      description: null,
      publication_year: null,
      publisher: null,
      cover_image_url: null
    };

    const result = await updateBook(updateInput);

    // Verify nullable fields are set to null
    expect(result.isbn).toBeNull();
    expect(result.description).toBeNull();
    expect(result.publication_year).toBeNull();
    expect(result.publisher).toBeNull();
    expect(result.cover_image_url).toBeNull();

    // Verify non-nullable fields are preserved
    expect(result.title).toEqual(testBook.title);
    expect(result.author).toEqual(testBook.author);
    expect(result.price).toEqual(testBook.price);
    expect(result.stock_quantity).toEqual(testBook.stock_quantity);
    expect(result.category).toEqual(testBook.category);
  });

  it('should save updated data to database', async () => {
    // Create a test book first
    const createdBook = await createTestBook(testBook);

    const updateInput: UpdateBookInput = {
      id: createdBook.id,
      title: 'Database Updated Title',
      price: 45.75
    };

    await updateBook(updateInput);

    // Query database directly to verify changes
    const updatedBooks = await db.select()
      .from(booksTable)
      .where(eq(booksTable.id, createdBook.id))
      .execute();

    expect(updatedBooks).toHaveLength(1);
    const dbBook = updatedBooks[0];
    
    expect(dbBook.title).toEqual('Database Updated Title');
    expect(parseFloat(dbBook.price)).toEqual(45.75);
    expect(dbBook.author).toEqual(testBook.author); // Should be preserved
    expect(dbBook.updated_at).toBeInstanceOf(Date);
    expect(dbBook.updated_at > createdBook.updated_at).toBe(true);
  });

  it('should throw error when book does not exist', async () => {
    const updateInput: UpdateBookInput = {
      id: 99999, // Non-existent ID
      title: 'Updated Title'
    };

    await expect(updateBook(updateInput)).rejects.toThrow(/Book with id 99999 not found/i);
  });

  it('should handle edge case with zero stock quantity', async () => {
    // Create a test book first
    const createdBook = await createTestBook(testBook);

    const updateInput: UpdateBookInput = {
      id: createdBook.id,
      stock_quantity: 0
    };

    const result = await updateBook(updateInput);

    expect(result.stock_quantity).toEqual(0);
    
    // Verify other fields are preserved
    expect(result.title).toEqual(testBook.title);
    expect(result.price).toEqual(testBook.price);
  });

  it('should handle minimum price correctly', async () => {
    // Create a test book first
    const createdBook = await createTestBook(testBook);

    const updateInput: UpdateBookInput = {
      id: createdBook.id,
      price: 0.01 // Minimum valid price
    };

    const result = await updateBook(updateInput);

    expect(result.price).toEqual(0.01);
    expect(typeof result.price).toBe('number');
  });
});