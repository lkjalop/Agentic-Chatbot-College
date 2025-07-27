import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

if (!process.env.NEON_DATABASE_URL_DIRECT) {
  throw new Error('NEON_DATABASE_URL_DIRECT is not defined');
}

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.NEON_DATABASE_URL_DIRECT,
  },
  verbose: true,
  strict: true,
});