import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input data
const testInput: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  first_name: 'John',
  last_name: 'Doe'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with hashed password', async () => {
    const result = await createUser(testInput);

    // Validate returned user object
    expect(result.email).toEqual('test@example.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toEqual('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123'); // Password should be hashed
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    expect(savedUser.email).toEqual('test@example.com');
    expect(savedUser.first_name).toEqual('John');
    expect(savedUser.last_name).toEqual('Doe');
    expect(savedUser.password_hash).toBeDefined();
    expect(savedUser.password_hash).not.toEqual('password123');
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);
  });

  it('should reject duplicate email addresses', async () => {
    // Create first user
    await createUser(testInput);

    // Attempt to create second user with same email
    const duplicateInput: CreateUserInput = {
      ...testInput,
      first_name: 'Jane',
      last_name: 'Smith'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/email already exists/i);
  });

  it('should handle different valid email formats', async () => {
    const emailVariations = [
      'user.name@domain.com',
      'user+tag@subdomain.example.org',
      'firstname.lastname123@company.co.uk'
    ];

    for (const email of emailVariations) {
      const input: CreateUserInput = {
        ...testInput,
        email: email
      };

      const result = await createUser(input);
      expect(result.email).toEqual(email);
      expect(result.id).toBeDefined();
    }
  });

  it('should handle special characters in names', async () => {
    const specialNameInput: CreateUserInput = {
      email: 'special@example.com',
      password: 'securepass456',
      first_name: "O'Connor",
      last_name: 'Smith-Jones'
    };

    const result = await createUser(specialNameInput);

    expect(result.first_name).toEqual("O'Connor");
    expect(result.last_name).toEqual('Smith-Jones');
    expect(result.email).toEqual('special@example.com');
  });

  it('should verify password hashing is secure', async () => {
    const password = 'testpassword123';
    const input: CreateUserInput = {
      email: 'hash.test@example.com',
      password: password,
      first_name: 'Hash',
      last_name: 'Test'
    };

    const result = await createUser(input);

    // Password hash should be different from original
    expect(result.password_hash).not.toEqual(password);
    expect(result.password_hash.length).toBeGreaterThan(10);
    
    // Verify hash using Bun's password verification
    const isValid = await Bun.password.verify(password, result.password_hash);
    expect(isValid).toBe(true);
  });

  it('should maintain database consistency across multiple users', async () => {
    const users: CreateUserInput[] = [
      { email: 'user1@test.com', password: 'pass1', first_name: 'User', last_name: 'One' },
      { email: 'user2@test.com', password: 'pass2', first_name: 'User', last_name: 'Two' },
      { email: 'user3@test.com', password: 'pass3', first_name: 'User', last_name: 'Three' }
    ];

    const results = [];
    for (const user of users) {
      results.push(await createUser(user));
    }

    // Verify all users have unique IDs
    const ids = results.map(r => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toEqual(3);

    // Verify all users exist in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(3);
    
    const emails = allUsers.map(u => u.email).sort();
    expect(emails).toEqual(['user1@test.com', 'user2@test.com', 'user3@test.com']);
  });
});