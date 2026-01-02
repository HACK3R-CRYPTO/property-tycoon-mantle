// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";
import {GameToken} from "../src/GameToken.sol";

/**
 * @title DeployOptimizedYieldDistributor
 * @notice Deploys optimized YieldDistributor with gas-efficient RWA calls
 * 
 * Optimizations:
 * - Calls getYieldRate() first (cheap, no strings)
 * - Only calls properties() if needed (expensive but works)
 * - Removed calls to non-existent functions
 */
contract DeployOptimizedYieldDistributor is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("==========================================");
        console.log("Deploying Optimized YieldDistributor");
        console.log("==========================================");
        
        // Existing contract addresses (Mantle Sepolia Testnet)
        address propertyNFTAddress = vm.envAddress("PROPERTY_NFT_ADDRESS");
        address gameTokenAddress = vm.envAddress("GAME_TOKEN_ADDRESS");
        
        console.log("PropertyNFT address:", propertyNFTAddress);
        console.log("GameToken address:", gameTokenAddress);
        
        // Deploy NEW optimized YieldDistributor
        console.log("\nDeploying optimized YieldDistributor...");
        YieldDistributor yieldDistributor = new YieldDistributor(
            propertyNFTAddress,
            gameTokenAddress
        );
        
        console.log("YieldDistributor deployed at:", address(yieldDistributor));
        
        // Set YieldDistributor as minter in GameToken
        console.log("\nSetting YieldDistributor as minter in GameToken...");
        GameToken gameToken = GameToken(gameTokenAddress);
        gameToken.setMinter(address(yieldDistributor), true);
        bool isMinter = gameToken.minters(address(yieldDistributor));
        console.log("YieldDistributor is minter:", isMinter);
        require(isMinter, "Failed to set YieldDistributor as minter");
        
        console.log("\n==========================================");
        console.log("Deployment Complete!");
        console.log("==========================================");
        console.log("New YieldDistributor address: ", address(yieldDistributor));
        console.log("\nOptimizations:");
        console.log("  - Calls getYieldRate() first (cheap)");
        console.log("  - Only calls properties() if needed");
        console.log("  - Removed non-existent function calls");
        console.log("\nNext steps:");
        console.log("1. Update frontend/.env.local:");
        console.log("   NEXT_PUBLIC_YIELD_DISTRIBUTOR_ADDRESS=", address(yieldDistributor));
        console.log("2. Update backend/.env:");
        console.log("   YIELD_DISTRIBUTOR_ADDRESS=", address(yieldDistributor));
        console.log("3. Test claimYield - gas should be much lower now!");
        
        vm.stopBroadcast();
    }
}

