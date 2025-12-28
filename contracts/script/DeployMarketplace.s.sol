// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Marketplace} from "../src/Marketplace.sol";

/**
 * @title DeployMarketplaceScript
 * @notice Deploy the Marketplace contract to Mantle Sepolia Testnet
 * @dev This contract uses ESCROW approach (NFTs transfer to marketplace)
 *      Better for high-value property assets - more secure for buyers
 */
contract DeployMarketplaceScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying Marketplace contract to Mantle Sepolia...");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        
        // Get contract addresses from environment
        address propertyNFT = vm.envAddress("PROPERTY_NFT_ADDRESS");
        address gameToken = vm.envAddress("GAME_TOKEN_ADDRESS");
        
        console.log("Using PropertyNFT:", propertyNFT);
        console.log("Using GameToken:", gameToken);
        
        // Deploy Marketplace
        Marketplace marketplace = new Marketplace(propertyNFT, gameToken);
        
        console.log("\n=== Marketplace Deployed ===");
        console.log("Address:", address(marketplace));
        console.log("\nIMPORTANT: Update these files with the new address:");
        console.log("  1. frontend/.env.local -> NEXT_PUBLIC_MARKETPLACE_ADDRESS");
        console.log("  2. backend/.env -> MARKETPLACE_ADDRESS");
        console.log("  3. frontend/src/lib/contracts.ts -> CONTRACTS.Marketplace (fallback)");
        console.log("\nFeatures:");
        console.log("  - Escrow-based (NFTs transfer to marketplace)");
        console.log("  - getActiveListings() function included");
        console.log("  - getActiveListingsCount() function included");
        console.log("  - Batch listing support");
        console.log("  - Auction support");
        console.log("  - 2.5% platform fee");
        
        vm.stopBroadcast();
    }
}

