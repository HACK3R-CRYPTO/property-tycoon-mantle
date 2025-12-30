import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';

@Injectable()
export class OracleService {
  private readonly logger = new Logger(OracleService.name);
  private provider: ethers.providers.JsonRpcProvider;

  // Chronicle Oracle addresses on Mantle Sepolia Testnet
  // Found from: https://chroniclelabs.org/dashboard/oracles
  private readonly ORACLE_ADDRESSES = {
    USDC: process.env.CHRONICLE_USDC_ORACLE || '0x9Dd500569A6e77ECdDE7694CDc2E58ac587768D0', // USDC/USD on Mantle Sepolia
    USDT: process.env.CHRONICLE_USDT_ORACLE || '0xD671F5F7c2fb6f75439641C36a578842f5b376A9', // USDT/USD on Mantle Sepolia
    ETH: process.env.CHRONICLE_ETH_ORACLE || '0xa6896dCf3f5Dc3c29A5bD3a788D6b7e901e487D8', // ETH/USD on Mantle Sepolia
    MNT: process.env.CHRONICLE_MNT_ORACLE || '0xe200dbc48e13339D9Da71f321d42Feb3B890Bc4e', // MNT/USD on Mantle Sepolia
  };

  // Chronicle Oracle ABI (IChronicle interface)
  // Based on Chronicle Protocol documentation
  private readonly ORACLE_ABI = [
    'function read() external view returns (uint256 value)',
    'function readWithAge() external view returns (uint256 value, uint256 age)',
    'function tryRead() external view returns (bool isValid, uint256 value)',
    'function tryReadWithAge() external view returns (bool isValid, uint256 value, uint256 age)',
  ];

  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(
      process.env.MANTLE_RPC_URL || 'https://rpc.mantle.xyz',
    );
  }

  /**
   * Get price from Chronicle Oracle
   * Uses Chronicle's IChronicle interface with proper error handling
   * @param oracleAddress Chronicle oracle contract address
   * @returns Price value (18 decimals) and timestamp
   */
  async getPrice(oracleAddress: string): Promise<{ price: bigint; timestamp: number }> {
    try {
      const oracle = new ethers.Contract(
        oracleAddress,
        this.ORACLE_ABI,
        this.provider,
      );

      // Use tryReadWithAge() for safe reading (doesn't revert)
      // Returns: (isValid, value, age)
      try {
        const [isValid, value, age] = await oracle.tryReadWithAge();
        
        if (!isValid) {
          throw new Error('Oracle value is not valid or stale');
        }
        
        // Chronicle returns value in 18 decimals (wei format)
        // age is Unix timestamp in seconds
        return {
          price: BigInt(value.toString()),
          timestamp: Number(age),
        };
      } catch (tryReadError) {
        // Fallback to readWithAge() if tryReadWithAge fails
        try {
          const [value, age] = await oracle.readWithAge();
          return {
            price: BigInt(value.toString()),
            timestamp: Number(age),
          };
        } catch (readError) {
          // Last fallback: try read() without age
          const value = await oracle.read();
          return {
            price: BigInt(value.toString()),
            timestamp: Math.floor(Date.now() / 1000), // Current timestamp as fallback
          };
        }
      }
    } catch (error) {
      this.logger.error(`Failed to get price from Chronicle oracle ${oracleAddress}`, error);
      throw error;
    }
  }
  
  /**
   * Check if Chronicle Oracle data is fresh
   * @param oracleAddress Chronicle oracle contract address
   * @param maxAgeSeconds Maximum acceptable age in seconds (default: 3 hours)
   * @returns True if data is fresh, false if stale
   */
  async isOracleDataFresh(
    oracleAddress: string,
    maxAgeSeconds: number = 3 * 60 * 60, // 3 hours default
  ): Promise<boolean> {
    try {
      const { timestamp } = await this.getPrice(oracleAddress);
      const currentTime = Math.floor(Date.now() / 1000);
      const age = currentTime - timestamp;
      
      return age <= maxAgeSeconds;
    } catch (error) {
      this.logger.warn(`Failed to check oracle data freshness: ${error.message}`);
      return false;
    }
  }

  /**
   * Get USDC price
   */
  async getUSDCPrice(): Promise<bigint> {
    const { price } = await this.getPrice(this.ORACLE_ADDRESSES.USDC);
    return price;
  }

  /**
   * Get USDT price
   */
  async getUSDTPrice(): Promise<bigint> {
    const { price } = await this.getPrice(this.ORACLE_ADDRESSES.USDT);
    return price;
  }

  /**
   * Get ETH price
   */
  async getETHPrice(): Promise<bigint> {
    const { price } = await this.getPrice(this.ORACLE_ADDRESSES.ETH);
    return price;
  }

  /**
   * Get MNT price
   */
  async getMNTPrice(): Promise<bigint> {
    const { price } = await this.getPrice(this.ORACLE_ADDRESSES.MNT);
    return price;
  }

  /**
   * Get property yield rate based on type
   * This would typically come from an RWA oracle or be calculated
   */
  async getPropertyYieldRate(propertyType: string): Promise<number> {
    // Base yield rates by property type
    const baseRates: Record<string, number> = {
      Residential: 5.0, // 5% APY
      Commercial: 8.0, // 8% APY
      Industrial: 12.0, // 12% APY
      Luxury: 15.0, // 15% APY
    };

    const baseRate = baseRates[propertyType] || 5.0;

    // In production, fetch from RWA oracle or adjust based on market conditions
    // For now, return base rate
    return baseRate;
  }

  /**
   * Get RWA property value from Chronicle Oracle
   * Chronicle provides RWA data feeds including property values
   * Falls back to contract query if Chronicle oracle not configured
   */
  async getRWAPropertyValue(rwaContract: string, tokenId: string): Promise<bigint> {
    try {
      // Option 1: Use Chronicle's RWA oracle if available
      // Chronicle has 65+ data feeds including RWAs
      // Check if Chronicle RWA oracle is configured
      const chronicleRWAOracle = process.env.CHRONICLE_RWA_PROPERTY_ORACLE;
      
      if (chronicleRWAOracle && chronicleRWAOracle !== '0x...' && chronicleRWAOracle !== '0x') {
        try {
          const { price } = await this.getPrice(chronicleRWAOracle);
          this.logger.log(`Got RWA property value from Chronicle Oracle: ${price}`);
          return price;
        } catch (chronicleError) {
          this.logger.warn('Chronicle RWA oracle failed, falling back to contract query', chronicleError);
        }
      }
      
      // Option 2: Query RWA contract directly (if it implements IRWA interface)
      // This works with MockRWA contract or any RWA that implements getPropertyValue()
      try {
        const rwaContractInstance = new ethers.Contract(
          rwaContract,
          ['function getRWAProperty(uint256) external view returns (tuple(string name, uint256 value, uint256 monthlyYield, string location, uint256 createdAt, bool isActive))'],
          this.provider,
        );
        
        const property = await rwaContractInstance.getRWAProperty(tokenId);
        if (property && property.value) {
          this.logger.log(`Got RWA property value from contract: ${property.value}`);
          return BigInt(property.value.toString());
        }
      } catch (contractError) {
        this.logger.warn('RWA contract query failed', contractError);
      }
      
      // Option 3: Fallback to mock value (for demo)
      this.logger.warn('Using fallback mock RWA property value - configure Chronicle oracle or use MockRWA contract');
      return BigInt(1000000 * 10**18); // 1M in wei (18 decimals)
    } catch (error) {
      this.logger.error('Failed to get RWA property value', error);
      throw error;
    }
  }
  
  /**
   * Get RWA yield rate from Chronicle Oracle
   * Chronicle provides yield rate feeds for RWAs
   */
  async getRWAYieldRate(rwaContract: string, tokenId: string): Promise<number> {
    try {
      // Try Chronicle's RWA yield rate oracle
      const chronicleYieldOracle = process.env.CHRONICLE_RWA_YIELD_ORACLE;
      
      if (chronicleYieldOracle && chronicleYieldOracle !== '0x...' && chronicleYieldOracle !== '0x') {
        try {
          const { price } = await this.getPrice(chronicleYieldOracle);
          // Chronicle may return basis points (500 = 5%) or percentage (5 = 5%)
          // Adjust based on Chronicle's format - typically basis points
          const yieldRate = Number(price) / 100; // Convert basis points to percentage
          this.logger.log(`Got RWA yield rate from Chronicle Oracle: ${yieldRate}%`);
          return yieldRate;
        } catch (chronicleError) {
          this.logger.warn('Chronicle yield oracle failed, falling back to contract query', chronicleError);
        }
      }
      
      // Fallback: Query RWA contract for yield rate
      try {
        const rwaContractInstance = new ethers.Contract(
          rwaContract,
          ['function getYieldRate(uint256) external view returns (uint256)'],
          this.provider,
        );
        
        const yieldRateBasisPoints = await rwaContractInstance.getYieldRate(tokenId);
        const yieldRate = Number(yieldRateBasisPoints) / 100; // Convert basis points to percentage
        this.logger.log(`Got RWA yield rate from contract: ${yieldRate}%`);
        return yieldRate;
      } catch (contractError) {
        this.logger.warn('RWA contract yield query failed', contractError);
      }
      
      // Fallback: Use default yield rate based on property type
      return await this.getPropertyYieldRate('Residential'); // Default 5%
    } catch (error) {
      this.logger.error('Failed to get RWA yield rate', error);
      return 5.0; // Default fallback
    }
  }
  
  /**
   * Verify RWA token using Chronicle's Proof of Asset (PoA)
   * Chronicle PoA provides cryptographic attestations for tokenized assets
   */
  async verifyRWAToken(rwaContract: string, tokenId: string): Promise<boolean> {
    try {
      // Chronicle's PoA oracle verifies that RWA tokens are backed by real assets
      // This provides cryptographic proof and continuous audit trail
      
      // Implementation depends on Chronicle's PoA API/contract
      // For now, return true if contract exists and token is valid
      const code = await this.provider.getCode(rwaContract);
      if (!code || code === '0x') {
        return false;
      }
      
      // Check if token exists (basic validation)
      // Full PoA verification would require Chronicle's PoA oracle
      this.logger.log(`Basic RWA token verification passed for ${rwaContract}:${tokenId}`);
      this.logger.warn('Full Chronicle PoA verification not yet implemented - configure Chronicle PoA oracle');
      
      return true;
    } catch (error) {
      this.logger.error('Failed to verify RWA token', error);
      return false;
    }
  }

  /**
   * Calculate yield amount for a property
   */
  async calculateYieldAmount(
    propertyValue: bigint,
    yieldRate: number,
    days: number = 1,
  ): Promise<bigint> {
    // Calculate daily yield: (value * rate / 100) / 365
    const dailyYield = (propertyValue * BigInt(Math.floor(yieldRate * 100))) / BigInt(36500);
    return dailyYield * BigInt(days);
  }
}

