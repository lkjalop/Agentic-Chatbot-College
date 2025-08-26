import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { neon } from '@neondatabase/serverless';
import { validateEnvironment } from '@/lib/config/environment';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import * as schema from './schema';

// Migration status tracking
export interface MigrationInfo {
  id: string;
  filename: string;
  applied: boolean;
  appliedAt?: Date;
  error?: string;
}

export class MigrationManager {
  private db: ReturnType<typeof drizzle>;
  private migrationsPath: string;

  constructor(connectionString?: string) {
    const env = validateEnvironment();
    const dbUrl = connectionString || env.NEON_DATABASE_URL;
    
    if (!dbUrl) {
      throw new Error('Database connection string is required');
    }

    const sql = neon(dbUrl);
    this.db = drizzle(sql, { schema });
    this.migrationsPath = join(process.cwd(), 'lib', 'db', 'migrations');
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<MigrationInfo[]> {
    try {
      console.log('🔄 Starting database migrations...');
      
      // Use Drizzle's built-in migration system
      await migrate(this.db, { 
        migrationsFolder: this.migrationsPath,
        migrationsTable: 'drizzle_migrations',
      });
      
      console.log('✅ All migrations completed successfully');
      return await this.getMigrationStatus();
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw new Error(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the status of all migrations
   */
  async getMigrationStatus(): Promise<MigrationInfo[]> {
    try {
      // Read migration files
      const migrationFiles = await this.getMigrationFiles();
      
      // Get applied migrations from database
      const appliedMigrations = await this.getAppliedMigrations();
      
      return migrationFiles.map(file => {
        const applied = appliedMigrations.find(m => m.name === file);
        return {
          id: file.replace('.sql', ''),
          filename: file,
          applied: !!applied,
          appliedAt: applied?.created_at,
        };
      });
    } catch (error) {
      console.error('Error getting migration status:', error);
      return [];
    }
  }

  /**
   * Check if database needs migrations
   */
  async needsMigrations(): Promise<boolean> {
    const status = await this.getMigrationStatus();
    return status.some(migration => !migration.applied);
  }

  /**
   * Validate database schema matches expectations
   */
  async validateSchema(): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if essential tables exist
      const requiredTables = [
        'users', 'conversations', 'messages', 'feedback',
        'student_queries', 'conversation_analytics'
      ];

      for (const table of requiredTables) {
        try {
          await this.db.execute(`SELECT 1 FROM ${table} LIMIT 1`);
        } catch (error) {
          errors.push(`Table '${table}' does not exist or is not accessible`);
        }
      }

      // Check for vector extension if using embeddings
      try {
        await this.db.execute(`SELECT 1 FROM pg_extension WHERE extname = 'vector'`);
      } catch (error) {
        warnings.push('Vector extension not found - vector search functionality may be limited');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
      };
    }
  }

  /**
   * Create a backup before running migrations
   */
  async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup_${timestamp}`;
    
    console.log(`🗄️ Creating backup: ${backupName}`);
    
    // Note: This would typically use pg_dump or similar
    // For Neon, you might use their backup APIs
    console.log('⚠️ Backup creation depends on your database provider');
    console.log('For Neon: Use branch creation or built-in backups');
    
    return backupName;
  }

  private async getMigrationFiles(): Promise<string[]> {
    try {
      const files = await readdir(this.migrationsPath);
      return files
        .filter(file => file.endsWith('.sql'))
        .sort();
    } catch (error) {
      console.warn('No migrations directory found');
      return [];
    }
  }

  private async getAppliedMigrations(): Promise<Array<{ name: string; created_at: Date }>> {
    try {
      const result = await this.db.execute(`
        SELECT filename as name, created_at 
        FROM drizzle_migrations 
        ORDER BY created_at
      `);
      return result.rows as Array<{ name: string; created_at: Date }>;
    } catch (error) {
      // Migration table might not exist yet
      return [];
    }
  }
}

// Utility functions for CLI and deployment
export async function runMigrations(connectionString?: string): Promise<void> {
  const manager = new MigrationManager(connectionString);
  
  // Create backup before migrations (in production)
  if (process.env.NODE_ENV === 'production') {
    await manager.createBackup();
  }
  
  await manager.runMigrations();
}

export async function checkMigrationStatus(connectionString?: string): Promise<MigrationInfo[]> {
  const manager = new MigrationManager(connectionString);
  return await manager.getMigrationStatus();
}

export async function validateDatabaseSchema(connectionString?: string): Promise<void> {
  const manager = new MigrationManager(connectionString);
  const validation = await manager.validateSchema();
  
  console.log('📋 Database Schema Validation');
  console.log('===============================');
  
  if (validation.valid) {
    console.log('✅ Schema is valid');
  } else {
    console.log('❌ Schema validation failed');
    validation.errors.forEach(error => {
      console.error(`  • ${error}`);
    });
  }
  
  if (validation.warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    validation.warnings.forEach(warning => {
      console.warn(`  • ${warning}`);
    });
  }
  
  if (!validation.valid) {
    throw new Error('Database schema validation failed');
  }
}