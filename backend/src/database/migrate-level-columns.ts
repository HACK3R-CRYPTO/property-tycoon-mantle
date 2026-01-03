import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:password@localhost:5432/property_tycoon';

async function migrateLevelColumns() {
  console.log('🔌 Connecting to database for migration...');
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    console.log('🔄 Migrating users table: adding level and experience columns...');
    
    // Add level and experience columns if they don't exist (for existing databases)
    await db.execute(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' 
          AND column_name = 'total_experience_points'
        ) THEN
          ALTER TABLE users ADD COLUMN total_experience_points NUMERIC DEFAULT 0 NOT NULL;
          RAISE NOTICE 'Added total_experience_points column';
        ELSE
          RAISE NOTICE 'Column total_experience_points already exists';
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' 
          AND column_name = 'level'
        ) THEN
          ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1 NOT NULL;
          RAISE NOTICE 'Added level column';
        ELSE
          RAISE NOTICE 'Column level already exists';
        END IF;
      END $$;
    `);

    console.log('✅ Migration completed successfully!');
    console.log('💡 Next: Run "npm run update:existing-levels:prod" to update existing users\' levels');
  } catch (error: any) {
    // If columns already exist or table doesn't exist, that's okay
    if (error.message?.includes('already exists') || error.message?.includes('does not exist')) {
      console.log('⚠️  Migration note:', error.message);
    } else {
      console.error('❌ Migration error:', error.message);
      throw error;
    }
  } finally {
    await client.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateLevelColumns()
    .then(() => {
      console.log('🎉 Level columns migration complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { migrateLevelColumns };

