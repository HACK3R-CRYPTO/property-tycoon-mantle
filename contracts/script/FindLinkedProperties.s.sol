// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PropertyNFT} from "../src/PropertyNFT.sol";

/**
 * @title FindLinkedProperties
 * @notice Find all properties that are linked to RWA
 */
contract FindLinkedProperties is Script {
    function run() external view {
        address propertyNFTAddr = vm.envOr("PROPERTY_NFT_ADDRESS", address(0));
        require(propertyNFTAddr != address(0), "PROPERTY_NFT_ADDRESS not set");
        
        PropertyNFT propertyNFT = PropertyNFT(propertyNFTAddr);
        
        console.log("=== Finding Properties Linked to RWA ===\n");
        console.log("Checking properties 1-50...\n");
        
        uint256 linkedCount = 0;
        
        for (uint256 i = 1; i <= 50; i++) {
            try propertyNFT.getProperty(i) returns (PropertyNFT.Property memory prop) {
                if (prop.rwaContract != address(0) && prop.rwaTokenId > 0) {
                    linkedCount++;
                    console.log("Property #", i, "IS LINKED:");
                    console.log("  RWA Contract:", prop.rwaContract);
                    console.log("  RWA Token ID:", prop.rwaTokenId);
                    console.log("  Property Value:", prop.value);
                    console.log("  Property Yield Rate:", prop.yieldRate);
                    console.log("");
                }
            } catch {
                // Property doesn't exist, skip
                continue;
            }
        }
        
        console.log("=== Summary ===");
        console.log("Total linked properties found:", linkedCount);
        
        if (linkedCount == 0) {
            console.log("\n[WARN] No properties are linked to RWA on-chain.");
            console.log("If you linked a property, check:");
            console.log("  1. Transaction succeeded in your wallet");
            console.log("  2. You're checking the correct property ID");
            console.log("  3. Wait a few seconds for blockchain sync");
        }
    }
}

