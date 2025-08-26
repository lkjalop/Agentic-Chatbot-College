#!/usr/bin/env node

import { runMigrations, checkMigrationStatus, validateDatabaseSchema } from '../lib/db/migrate';
import { validateEnvironment } from '../lib/config/environment';

/**
 * Database Migration CLI Script
 * 
 * Usage:
 *   npm run db:migrate        - Run all pending migrations
 *   npm run db:status         - Check migration status
 *   npm run db:validate       - Validate database schema
 */

async function main() {
  const command = process.argv[2];
  
  try {
    // Validate environment first
    const env = validateEnvironment();
    
    if (!env.NEON_DATABASE_URL) {
      console.error('❌ NEON_DATABASE_URL is required for database operations');
      process.exit(1);
    }

    switch (command) {
      case 'migrate':
        console.log('🚀 Running database migrations...');
        await runMigrations();
        console.log('✅ Migrations completed successfully');
        break;

      case 'status':
        console.log('📋 Checking migration status...');
        const migrations = await checkMigrationStatus();
        
        console.log('\nMigration Status:');
        console.log('================');
        
        if (migrations.length === 0) {
          console.log('No migrations found');
        } else {
          migrations.forEach(migration => {
            const status = migration.applied ? '✅' : '⏳';
            const appliedAt = migration.appliedAt 
              ? `(${migration.appliedAt.toISOString()})` 
              : '';
            console.log(`${status} ${migration.filename} ${appliedAt}`);
          });
        }
        break;

      case 'validate':
        console.log('🔍 Validating database schema...');
        await validateDatabaseSchema();
        break;

      case 'reset':
        console.log('⚠️ Database reset not implemented for safety');
        console.log('To reset the database:');
        console.log('1. Drop all tables manually');
        console.log('2. Run: npm run db:migrate');
        break;

      default:
        console.log('Database Migration CLI');
        console.log('=====================');
        console.log('');
        console.log('Available commands:');
        console.log('  migrate   - Run all pending migrations');
        console.log('  status    - Check migration status');
        console.log('  validate  - Validate database schema');
        console.log('  reset     - Instructions for database reset');
        console.log('');
        console.log('Examples:');
        console.log('  npm run db:migrate');
        console.log('  npm run db:status');
        console.log('  npm run db:validate');
        break;
    }
  } catch (error) {
    console.error('❌ Operation failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});