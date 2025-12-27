// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";

contract DeployYieldDistributorScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying UPDATED YieldDistributor contract to Mantle Sepolia...");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        
        // Existing contract addresses (DO NOT CHANGE)
        address propertyNFT = 0x0AE7119c7187D88643fb7B409937B68828eE733D;
        address gameToken = 0x32D9a9b9e241Da421f34786De0B39fD34D1EfeA8;
        
        console.log("Using PropertyNFT:", propertyNFT);
        console.log("Using GameToken:", gameToken);
        
        // Deploy NEW YieldDistributor with fixed claimYield() logic
        YieldDistributor yieldDistributor = new YieldDistributor(
            propertyNFT,
            gameToken
        );
        
        console.log("\n=== NEW YieldDistributor Deployed ===");
        console.log("Address:", address(yieldDistributor));
        console.log("\nIMPORTANT: Update these files with the new address:");
        console.log("  1. frontend/.env.local -> NEXT_PUBLIC_YIELD_DISTRIBUTOR_ADDRESS");
        console.log("  2. backend/.env -> YIELD_DISTRIBUTOR_ADDRESS");
        console.log("  3. frontend/src/lib/contracts.ts -> CONTRACTS.YieldDistributor (fallback)");
        
        vm.stopBroadcast();
    }
}

