import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:password@localhost:5432/property_tycoon';

/**
 * Calculate experience points from user stats
 * XP = (properties * 100) + (yieldEarned / 1e16) + (portfolioValue / 1e17)
 */
function calculateExperiencePoints(
  propertiesCount: number,
  totalYieldEarned: bigint,
  totalPortfolioValue: bigint,
): number {
  const propertiesXP = propertiesCount * 100;
  const yieldXP = Number(totalYieldEarned) / 1e16; // 1 XP per 0.01 TYC
  const portfolioXP = Number(totalPortfolioValue) / 1e17; // 1 XP per 0.1 TYC
  return propertiesXP + yieldXP + portfolioXP;
}

/**
 * Calculate level from total experience points
 * Level = floor(sqrt(totalXP / 1000)) + 1
 */
function calculateLevel(totalXP: number): number {
  return Math.max(1, Math.floor(Math.sqrt(totalXP / 1000)) + 1);
}

async function updateExistingUsersLevels() {
  console.log('🔌 Connecting to database...');
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    console.log('🔄 Fetching all users...');
    
    // Get all users
    const users = await db.select().from(schema.users);
    
    console.log(`📊 Found ${users.length} users to update`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const user of users) {
      try {
        const totalPortfolioValue = BigInt(user.totalPortfolioValue?.toString() || '0');
        const totalYieldEarned = BigInt(user.totalYieldEarned?.toString() || '0');
        const propertiesCount = user.propertiesOwned || 0;

        // Calculate XP and level
        const totalXP = calculateExperiencePoints(propertiesCount, totalYieldEarned, totalPortfolioValue);
        const level = calculateLevel(totalXP);

        // Update user
        await db
          .update(schema.users)
          .set({
            totalExperiencePoints: totalXP.toString(),
            level: level,
            updatedAt: new Date(),
          })
          .where(eq(schema.users.id, user.id));

        console.log(`✅ Updated ${user.walletAddress}: Level ${level}, XP ${totalXP.toFixed(2)} (${propertiesCount} properties, ${(Number(totalYieldEarned) / 1e18).toFixed(2)} TYC yield, ${(Number(totalPortfolioValue) / 1e18).toFixed(2)} TYC portfolio)`);
        updatedCount++;
      } catch (error: any) {
        console.error(`❌ Failed to update user ${user.walletAddress}:`, error.message);
        skippedCount++;
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Updated: ${updatedCount} users`);
    console.log(`   Skipped: ${skippedCount} users`);
  } catch (error) {
    console.error('❌ Error updating user levels:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run update if called directly
if (require.main === module) {
  updateExistingUsersLevels()
    .then(() => {
      console.log('🎉 Existing users levels updated!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Update failed:', error);
      process.exit(1);
    });
}

export { updateExistingUsersLevels };

