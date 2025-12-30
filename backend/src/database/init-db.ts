import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:password@localhost:5432/property_tycoon';

async function initDatabase() {
  console.log('🔌 Connecting to database...');
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    console.log('📦 Creating tables...');
    
    // Use Drizzle's push to create tables from schema
    // This will create all tables defined in the schema
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_address VARCHAR(42) NOT NULL UNIQUE,
        username VARCHAR(100),
        total_portfolio_value NUMERIC DEFAULT 0,
        total_yield_earned NUMERIC DEFAULT 0,
        properties_owned INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS properties (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token_id BIGINT NOT NULL UNIQUE,
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        property_type VARCHAR(50) NOT NULL,
        value NUMERIC NOT NULL,
        yield_rate INTEGER NOT NULL,
        rwa_contract VARCHAR(42),
        rwa_token_id BIGINT,
        total_yield_earned BIGINT DEFAULT 0,
        x INTEGER,
        y INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS yield_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount BIGINT NOT NULL,
        claimed BOOLEAN DEFAULT false,
        transaction_hash VARCHAR(66),
        claimed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS marketplace_listings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        price BIGINT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        listing_type VARCHAR(20) NOT NULL,
        auction_end_time TIMESTAMP,
        highest_bid BIGINT,
        highest_bidder_id UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS quests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quest_id BIGINT NOT NULL UNIQUE,
        name VARCHAR(200) NOT NULL,
        description VARCHAR(1000),
        reward_amount NUMERIC NOT NULL,
        required_properties INTEGER DEFAULT 0 NOT NULL,
        required_property_type VARCHAR(50),
        active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      -- Alter reward_amount from BIGINT to NUMERIC if it exists as BIGINT
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'quests' 
          AND column_name = 'reward_amount' 
          AND data_type = 'bigint'
        ) THEN
          ALTER TABLE quests ALTER COLUMN reward_amount TYPE NUMERIC USING reward_amount::text::numeric;
        END IF;
      END $$;
      
      -- Add required_property_type column if it doesn't exist
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'quests' 
          AND column_name = 'required_property_type'
        ) THEN
          ALTER TABLE quests ADD COLUMN required_property_type VARCHAR(50);
        END IF;
      END $$;
      
      -- Alter quest_id to BIGINT if it's INTEGER (handle existing data)
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'quests' 
          AND column_name = 'quest_id' 
          AND data_type = 'integer'
        ) THEN
          -- First drop the unique constraint if it exists
          ALTER TABLE quests DROP CONSTRAINT IF EXISTS quests_quest_id_key;
          -- Then alter the column type
          ALTER TABLE quests ALTER COLUMN quest_id TYPE BIGINT USING quest_id::bigint;
          -- Re-add the unique constraint
          ALTER TABLE quests ADD CONSTRAINT quests_quest_id_key UNIQUE (quest_id);
        END IF;
      END $$;
      
      -- Ensure required_properties has NOT NULL constraint
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'quests' 
          AND column_name = 'required_properties' 
          AND is_nullable = 'YES'
        ) THEN
          ALTER TABLE quests ALTER COLUMN required_properties SET NOT NULL;
          ALTER TABLE quests ALTER COLUMN required_properties SET DEFAULT 0;
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS quest_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        completed BOOLEAN DEFAULT false,
        progress INTEGER DEFAULT 0,
        reward_claimed BOOLEAN DEFAULT false,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(quest_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS leaderboard (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        total_portfolio_value NUMERIC DEFAULT 0,
        total_yield_earned NUMERIC DEFAULT 0,
        properties_owned INTEGER DEFAULT 0,
        quests_completed INTEGER DEFAULT 0,
        rank INTEGER,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS guilds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        total_members INTEGER DEFAULT 1 NOT NULL,
        total_portfolio_value BIGINT DEFAULT 0 NOT NULL,
        total_yield_earned BIGINT DEFAULT 0 NOT NULL,
        is_public BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS guild_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) DEFAULT 'member' NOT NULL,
        joined_at TIMESTAMP DEFAULT NOW(),
        contribution NUMERIC DEFAULT '0' NOT NULL,
        UNIQUE(guild_id, user_id)
      );

      -- Migrate existing contribution column from BIGINT to NUMERIC if it exists
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'guild_members' 
          AND column_name = 'contribution' 
          AND data_type = 'bigint'
        ) THEN
          ALTER TABLE guild_members 
          ALTER COLUMN contribution TYPE NUMERIC USING contribution::text::numeric;
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
      CREATE INDEX IF NOT EXISTS idx_guilds_owner_id ON guilds(owner_id);
      CREATE INDEX IF NOT EXISTS idx_guild_members_guild_id ON guild_members(guild_id);
      CREATE INDEX IF NOT EXISTS idx_guild_members_user_id ON guild_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_properties_token_id ON properties(token_id);
      CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id);
      CREATE INDEX IF NOT EXISTS idx_yield_records_property_id ON yield_records(property_id);
      CREATE INDEX IF NOT EXISTS idx_yield_records_owner_id ON yield_records(owner_id);
      CREATE INDEX IF NOT EXISTS idx_marketplace_listings_property_id ON marketplace_listings(property_id);
      CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller_id ON marketplace_listings(seller_id);
      CREATE INDEX IF NOT EXISTS idx_quest_progress_user_id ON quest_progress(user_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
    `);

    console.log('✅ Database tables created successfully!');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    await client.end();
  }
}

initDatabase()
  .then(() => {
    console.log('🎉 Database initialization complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Database initialization failed:', error);
    process.exit(1);
  });
