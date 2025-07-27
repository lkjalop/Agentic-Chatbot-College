import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

if (!process.env.NEON_DATABASE_URL) {
  throw new Error('NEON_DATABASE_URL is not defined');
}

const sql = neon(process.env.NEON_DATABASE_URL);
export const db = drizzle(sql, { schema });
export { schema };

export async function checkDatabaseConnection() {
  try {
    const result = await sql`SELECT 1 as check`;
    return { connected: true, result };
  } catch (error) {
    console.error('Database connection error:', error);
    return { connected: false, error };
  }
}

export async function withTransaction<T>(
  callback: (tx: typeof db) => Promise<T>
): Promise<T> {
  return callback(db);
}