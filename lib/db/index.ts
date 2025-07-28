import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

let dbInstance: any = null;
let sqlInstance: any = null;

export function getDb() {
  if (!dbInstance) {
    if (!process.env.NEON_DATABASE_URL) {
      throw new Error('NEON_DATABASE_URL is not defined');
    }
    
    sqlInstance = neon(process.env.NEON_DATABASE_URL);
    dbInstance = drizzle(sqlInstance, { schema });
  }
  
  return dbInstance;
}

// Export getDb as db for easy usage: db()
export { getDb as db };
export { schema };

export async function checkDatabaseConnection() {
  try {
    getDb(); // Initialize if needed
    const result = await sqlInstance!`SELECT 1 as check`;
    return { connected: true, result };
  } catch (error) {
    console.error('Database connection error:', error);
    return { connected: false, error };
  }
}

export async function withTransaction<T>(
  callback: (tx: ReturnType<typeof getDb>) => Promise<T>
): Promise<T> {
  return callback(getDb());
}