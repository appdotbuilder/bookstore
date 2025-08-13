import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { loginUser } from '../handlers/login_user';
import { eq } from 'drizzle-orm';

// Test user data
const testUserData = {
  email: 'test@example.com',
  password_hash: 'hash_testpassword123', // Simple hash format for testing
  first_name: 'John',
  last_name: 'Doe'
};

const validLoginInput: LoginInput = {
  email: 'test@example.com',
  password: 'testpassword123'
};

const invalidEmailInput: LoginInput = {
  email: 'nonexistent@example.com',
  password: 'testpassword123'
};

const invalidPasswordInput: LoginInput = {
  email: 'test@example.com',
  password: 'wrongpassword'
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully login with valid credentials', async () => {
    // Create test user in database
    const createdUsers = await db.insert(usersTable)
      .values(testUserData)
      .returning()
      .execute();

    const testUser = createdUsers[0];

    // Attempt login
    const result = await loginUser(validLoginInput);

    // Verify returned user data
    expect(result.id).toBe(testUser.id);
    expect(result.email).toBe(testUserData.email);
    expect(result.first_name).toBe(testUserData.first_name);
    expect(result.last_name).toBe(testUserData.last_name);
    expect(result.password_hash).toBe(testUserData.password_hash);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent email', async () => {
    // Create test user but attempt login with different email
    await db.insert(usersTable)
      .values(testUserData)
      .returning()
      .execute();

    // Attempt login with non-existent email
    await expect(loginUser(invalidEmailInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for incorrect password', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUserData)
      .returning()
      .execute();

    // Attempt login with wrong password
    await expect(loginUser(invalidPasswordInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should not expose password hash differences in error messages', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUserData)
      .returning()
      .execute();

    // Both invalid email and password should return same error message
    try {
      await loginUser(invalidEmailInput);
    } catch (emailError: any) {
      try {
        await loginUser(invalidPasswordInput);
      } catch (passwordError: any) {
        expect(emailError.message).toBe(passwordError.message);
      }
    }
  });

  it('should verify user exists in database after successful login', async () => {
    // Create test user
    const createdUsers = await db.insert(usersTable)
      .values(testUserData)
      .returning()
      .execute();

    const testUser = createdUsers[0];

    // Login
    const result = await loginUser(validLoginInput);

    // Verify user still exists in database
    const dbUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(dbUsers).toHaveLength(1);
    expect(dbUsers[0].email).toBe(testUser.email);
    expect(dbUsers[0].first_name).toBe(testUser.first_name);
    expect(dbUsers[0].last_name).toBe(testUser.last_name);
  });

  it('should handle multiple users with different emails', async () => {
    // Create multiple test users
    const user1Data = {
      email: 'user1@example.com',
      password_hash: 'hash_password1',
      first_name: 'Alice',
      last_name: 'Smith'
    };

    const user2Data = {
      email: 'user2@example.com',
      password_hash: 'hash_password2',
      first_name: 'Bob',
      last_name: 'Jones'
    };

    await db.insert(usersTable)
      .values([user1Data, user2Data])
      .execute();

    // Login as first user
    const result1 = await loginUser({
      email: 'user1@example.com',
      password: 'password1'
    });

    expect(result1.email).toBe(user1Data.email);
    expect(result1.first_name).toBe(user1Data.first_name);

    // Login as second user
    const result2 = await loginUser({
      email: 'user2@example.com',
      password: 'password2'
    });

    expect(result2.email).toBe(user2Data.email);
    expect(result2.first_name).toBe(user2Data.first_name);

    // Ensure they have different IDs
    expect(result1.id).not.toBe(result2.id);
  });
});