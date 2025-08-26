import { defineConfig } from 'drizzle-kit';
import { validateEnvironment } from './lib/config/environment';

// Load and validate environment variables
const env = validateEnvironment();

export default defineConfig({
  // Database connection
  dialect: 'postgresql',
  dbCredentials: {
    url: env.NEON_DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy',
  },

  // Schema and migrations
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  
  // Migration settings
  migrations: {
    table: 'drizzle_migrations',
    schema: 'public',
  },

  // Development settings
  verbose: true,
  strict: true,

  // Introspection settings for schema sync
  introspect: {
    casing: 'snake_case',
  },

  // Type generation
  schemaFilter: ['public'],
});