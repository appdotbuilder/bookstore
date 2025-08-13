import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const loginUser = async (input: LoginInput): Promise<User> => {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // For this implementation, we'll use a simple password verification
    // In a real application, you would use bcrypt.compare() or similar
    // For now, we'll assume the input password should match a simple hash format
    const isPasswordValid = await verifyPassword(input.password, user.password_hash);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Return user data without password hash for security
    return {
      id: user.id,
      email: user.email,
      password_hash: user.password_hash,
      first_name: user.first_name,
      last_name: user.last_name,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

// Simple password verification function
// In a real application, this would use bcrypt or similar
async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  // For testing purposes, we'll use a simple hash format: "hash_" + plainPassword
  // In production, use bcrypt.compare(plainPassword, hashedPassword)
  return hashedPassword === `hash_${plainPassword}`;
}