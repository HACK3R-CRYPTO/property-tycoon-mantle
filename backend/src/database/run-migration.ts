import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:password@localhost:5432/property_tycoon';

async function runMigration() {
  console.log('🔌 Connecting to database...');
  const client = postgres(connectionString, { max: 1 });

  try {
    console.log('🔄 Migrating guild_members.contribution from BIGINT to NUMERIC...');
    
    await client`
      ALTER TABLE guild_members 
      ALTER COLUMN contribution TYPE NUMERIC USING contribution::text::numeric;
    `;

    console.log('✅ Migration completed successfully!');
  } catch (error: any) {
    if (error.message?.includes('does not exist')) {
      console.log('⚠️  Column might already be NUMERIC or table does not exist');
    } else {
      console.error('❌ Migration error:', error.message);
      throw error;
    }
  } finally {
    await client.end();
  }
}

runMigration()
  .then(() => {
    console.log('🎉 Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });


