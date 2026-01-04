import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { eq } from 'drizzle-orm';
import { ethers } from 'ethers';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:password@localhost:5432/property_tycoon';

// Contract addresses and ABIs (simplified - just for getting properties)
const PROPERTY_NFT_ADDRESS = process.env.PROPERTY_NFT_ADDRESS || '';
const YIELD_DISTRIBUTOR_ADDRESS = process.env.YIELD_DISTRIBUTOR_ADDRESS || '';
const RPC_URL = process.env.RPC_URL || process.env.MANTLE_RPC_URL || 'https://rpc.sepolia.mantle.xyz';

// Simple ABI for getting owner properties
const PROPERTY_NFT_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function getProperty(uint256 tokenId) view returns (tuple(uint256 propertyType, uint256 value, uint256 yieldRate, uint256 totalYieldEarned, uint256 createdAt, address owner, bool isActive))',
  'function getOwnerProperties(address owner) view returns (uint256[])',
];

const YIELD_DISTRIBUTOR_ABI = [
  'function propertyTotalYieldEarned(uint256 propertyId) view returns (uint256)',
];

/**
 * Calculate experience points from user stats
 * XP = (properties * 50) + (yieldEarned / 2e16) + (portfolioValue / 2e17)
 * Reduced by 50% to make leveling more balanced
 */
function calculateExperiencePoints(
  propertiesCount: number,
  totalYieldEarned: bigint,
  totalPortfolioValue: bigint,
): number {
  const propertiesXP = propertiesCount * 50; // Reduced from 100 to 50
  const yieldXP = Number(totalYieldEarned) / 2e16; // 1 XP per 0.02 TYC (reduced from 0.01)
  const portfolioXP = Number(totalPortfolioValue) / 2e17; // 1 XP per 0.2 TYC (reduced from 0.1)
  return propertiesXP + yieldXP + portfolioXP;
}

/**
 * Calculate level from total experience points
 * Level = floor(sqrt(totalXP / 1000)) + 1
 */
function calculateLevel(totalXP: number): number {
  return Math.max(1, Math.floor(Math.sqrt(totalXP / 1000)) + 1);
}

async function fetchUserStatsFromBlockchain(walletAddress: string): Promise<{
  propertiesCount: number;
  totalPortfolioValue: bigint;
  totalYieldEarned: bigint;
}> {
  if (!PROPERTY_NFT_ADDRESS || !RPC_URL) {
    console.log('⚠️  Contract addresses or RPC URL not configured, using database values');
    return { propertiesCount: 0, totalPortfolioValue: BigInt(0), totalYieldEarned: BigInt(0) };
  }

  try {
    // Use ethers v5 API
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const propertyNFT = new ethers.Contract(PROPERTY_NFT_ADDRESS, PROPERTY_NFT_ABI, provider);
    const yieldDistributor = YIELD_DISTRIBUTOR_ADDRESS 
      ? new ethers.Contract(YIELD_DISTRIBUTOR_ADDRESS, YIELD_DISTRIBUTOR_ABI, provider)
      : null;

    // Try to use getOwnerProperties first (more efficient)
    let tokenIds: bigint[] = [];
    try {
      const result = await propertyNFT.getOwnerProperties(walletAddress);
      if (Array.isArray(result)) {
        tokenIds = result.map((id: any) => BigInt(id.toString()));
      } else if (result && typeof result === 'object' && 'length' in result) {
        tokenIds = Array.from(result as any).map((id: any) => BigInt(id.toString()));
      }
    } catch (error) {
      // Fallback to balanceOf + tokenOfOwnerByIndex
      try {
        const balance = await propertyNFT.balanceOf(walletAddress);
        const propertyCount = Number(balance.toString());
        for (let i = 0; i < propertyCount; i++) {
          try {
            const tokenId = await propertyNFT.tokenOfOwnerByIndex(walletAddress, i);
            tokenIds.push(BigInt(tokenId.toString()));
          } catch {
            continue;
          }
        }
      } catch {
        return { propertiesCount: 0, totalPortfolioValue: BigInt(0), totalYieldEarned: BigInt(0) };
      }
    }

    if (tokenIds.length === 0) {
      return { propertiesCount: 0, totalPortfolioValue: BigInt(0), totalYieldEarned: BigInt(0) };
    }

    // Calculate portfolio value and yield from blockchain
    let totalPortfolioValue = BigInt(0);
    let totalYieldEarned = BigInt(0);

    for (const tokenId of tokenIds) {
      try {
        const propertyData = await propertyNFT.getProperty(tokenId);
        const value = BigInt(propertyData.value.toString());
        totalPortfolioValue += value;

        // Try to get yield from YieldDistributor first
        if (yieldDistributor) {
          try {
            const yieldEarned = await yieldDistributor.propertyTotalYieldEarned(tokenId);
            if (yieldEarned && yieldEarned.toString() !== '0') {
              totalYieldEarned += BigInt(yieldEarned.toString());
            } else {
              // Fallback to property's totalYieldEarned
              const propYield = BigInt(propertyData.totalYieldEarned?.toString() || '0');
              totalYieldEarned += propYield;
            }
          } catch {
            // Fallback to property's totalYieldEarned
            const propYield = BigInt(propertyData.totalYieldEarned?.toString() || '0');
            totalYieldEarned += propYield;
          }
        } else {
          const propYield = BigInt(propertyData.totalYieldEarned?.toString() || '0');
          totalYieldEarned += propYield;
        }
      } catch (error) {
        console.warn(`Failed to fetch property ${tokenId}:`, error);
      }
    }

    return {
      propertiesCount: tokenIds.length,
      totalPortfolioValue,
      totalYieldEarned,
    };
  } catch (error: any) {
    console.warn(`Failed to fetch from blockchain for ${walletAddress}:`, error.message);
    return { propertiesCount: 0, totalPortfolioValue: BigInt(0), totalYieldEarned: BigInt(0) };
  }
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
    console.log('🌐 Fetching current stats from blockchain for accurate level calculation...\n');
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const user of users) {
      try {
        // Fetch current stats from blockchain (source of truth)
        const blockchainStats = await fetchUserStatsFromBlockchain(user.walletAddress);
        
        // Use blockchain stats if available, otherwise fallback to database
        const propertiesCount = blockchainStats.propertiesCount > 0 
          ? blockchainStats.propertiesCount 
          : (user.propertiesOwned || 0);
        const totalPortfolioValue = blockchainStats.totalPortfolioValue > BigInt(0)
          ? blockchainStats.totalPortfolioValue
          : BigInt(user.totalPortfolioValue?.toString() || '0');
        const totalYieldEarned = blockchainStats.totalYieldEarned > BigInt(0)
          ? blockchainStats.totalYieldEarned
          : BigInt(user.totalYieldEarned?.toString() || '0');

        // Calculate XP and level
        const totalXP = calculateExperiencePoints(propertiesCount, totalYieldEarned, totalPortfolioValue);
        const level = calculateLevel(totalXP);

        // Update user in database
        await db
          .update(schema.users)
          .set({
            totalExperiencePoints: totalXP.toString(),
            level: level,
            propertiesOwned: propertiesCount,
            totalPortfolioValue: totalPortfolioValue.toString(),
            totalYieldEarned: totalYieldEarned.toString(),
            updatedAt: new Date(),
          })
          .where(eq(schema.users.id, user.id));

        const source = blockchainStats.propertiesCount > 0 ? '🌐 blockchain' : '💾 database';
        console.log(`✅ Updated ${user.walletAddress}: Level ${level}, XP ${totalXP.toFixed(2)} (${propertiesCount} properties, ${(Number(totalYieldEarned) / 1e18).toFixed(2)} TYC yield, ${(Number(totalPortfolioValue) / 1e18).toFixed(2)} TYC portfolio) [${source}]`);
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

