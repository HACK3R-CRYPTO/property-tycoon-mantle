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
    MNT: process.env.CHRONICLE_MNT_ORACLE || '0xCE0F753FDEEE2D0EC5F1ba086bD7d5087C20c307', // MNT/USD on Mantle Sepolia
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
   * Calculate yield amount based on property value, yield rate, and time period
   * @param propertyValue Property value in wei (18 decimals)
   * @param yieldRate Annual yield rate as percentage (e.g., 5.0 for 5% APY)
   * @param days Number of days to calculate yield for
   * @returns Yield amount in wei (18 decimals)
   */
  async calculateYieldAmount(
    propertyValue: bigint,
    yieldRate: number,
    days: number,
  ): Promise<bigint> {
    // Convert yield rate from percentage to decimal (e.g., 5.0% -> 0.05)
    const yieldRateDecimal = yieldRate / 100;
    
    // Calculate annual yield: propertyValue * yieldRateDecimal
    const annualYield = (propertyValue * BigInt(Math.floor(yieldRateDecimal * 1e18))) / BigInt(1e18);
    
    // Calculate yield for the given number of days: annualYield * (days / 365)
    // Use 1e18 for precision in division
    const daysBigInt = BigInt(Math.floor(days * 1e18));
    const daysInYear = BigInt(365 * 1e18);
    const yieldAmount = (annualYield * daysBigInt) / daysInYear;
    
    return yieldAmount;
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
      
      // Option 3: Fallback to default value (for demo)
      // Return a default property value if all queries fail
      this.logger.warn(`All RWA property value queries failed for contract ${rwaContract}, token ${tokenId}. Returning default value.`);
      return BigInt(0); // Return 0 as fallback
    } catch (error) {
      this.logger.error(`Failed to get RWA property value for ${rwaContract}, token ${tokenId}`, error);
      // Return 0 as fallback on any error
      return BigInt(0);
    }
  }
}