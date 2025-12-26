import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

const runMigration = async () => {
  const connectionString =
    process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/clash_on_somnia';

  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);

  console.log('⏳ Running migrations...');

  await migrate(db, { migrationsFolder: './src/database/migrations' });

  console.log('✅ Migrations completed!');

  await sql.end();
  process.exit(0);
};

runMigration().catch((err) => {
  console.error('❌ Migration failed!');
  console.error(err);
  process.exit(1);
});
