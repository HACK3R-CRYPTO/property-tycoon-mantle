// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";

contract DeployYieldDistributorScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying UPDATED YieldDistributor with RWA integration to Mantle Sepolia...");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        
        // Existing contract addresses (Mantle Sepolia Testnet)
        address propertyNFT = 0xeD1c7F14F40DF269E561Eb775fbD0b9dF3B4892c;
        address gameToken = 0x3334f87178AD0f33e61009777a3dFa1756e9c23f;
        
        console.log("Using PropertyNFT:", propertyNFT);
        console.log("Using GameToken:", gameToken);
        
        // Deploy NEW YieldDistributor with RWA yield integration
        // This version uses RWA data for yield calculation when property is linked to RWA
        YieldDistributor yieldDistributor = new YieldDistributor(
            propertyNFT,
            gameToken
        );
        
        console.log("\n=== NEW YieldDistributor Deployed (with RWA integration) ===");
        console.log("Address:", address(yieldDistributor));
        console.log("\nFeatures:");
        console.log("  - Uses RWA value and yield rate when property linked to RWA");
        console.log("  - Falls back to property data if not linked");
        console.log("  - Backward compatible with existing properties");
        console.log("\nIMPORTANT: Update these files with the new address:");
        console.log("  1. frontend/.env.local -> NEXT_PUBLIC_YIELD_DISTRIBUTOR_ADDRESS");
        console.log("  2. backend/.env -> YIELD_DISTRIBUTOR_ADDRESS");
        console.log("  3. frontend/src/lib/contracts.ts -> CONTRACTS.YieldDistributor (fallback)");
        console.log("  4. contracts/README.md -> YieldDistributor address");
        
        vm.stopBroadcast();
    }
}

