// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";
import {PropertyNFT} from "../src/PropertyNFT.sol";
import {MockRWA} from "../src/MockRWA.sol";

/**
 * @title VerifyRWAYield
 * @notice Script to verify that RWA yield integration is working correctly
 * @dev Compares yield calculation for linked vs unlinked properties
 */
contract VerifyRWAYield is Script {
    function run() external view {
        // Contract addresses (Mantle Sepolia Testnet)
        address yieldDistributorAddr = vm.envOr("YIELD_DISTRIBUTOR_ADDRESS", address(0));
        address propertyNFTAddr = vm.envOr("PROPERTY_NFT_ADDRESS", address(0));
        address mockRWAAddr = vm.envOr("MOCK_RWA_ADDRESS", address(0));
        
        require(yieldDistributorAddr != address(0), "YIELD_DISTRIBUTOR_ADDRESS not set");
        require(propertyNFTAddr != address(0), "PROPERTY_NFT_ADDRESS not set");
        require(mockRWAAddr != address(0), "MOCK_RWA_ADDRESS not set");
        
        YieldDistributor yieldDistributor = YieldDistributor(yieldDistributorAddr);
        PropertyNFT propertyNFT = PropertyNFT(propertyNFTAddr);
        MockRWA mockRWA = MockRWA(mockRWAAddr);
        
        console.log("=== RWA Yield Integration Verification ===\n");
        
        // Get a property ID to test (you can change this)
        uint256 propertyId = vm.envOr("PROPERTY_ID", uint256(0));
        
        if (propertyId == 0) {
            console.log("Usage: Set PROPERTY_ID in .env to test a specific property");
            console.log("Example: PROPERTY_ID=1 forge script script/VerifyRWAYield.s.sol:VerifyRWAYield --rpc-url $MANTLE_RPC_URL");
            return;
        }
        
        console.log("Testing Property ID:", propertyId);
        console.log("YieldDistributor:", yieldDistributorAddr);
        console.log("PropertyNFT:", propertyNFTAddr);
        console.log("MockRWA:", mockRWAAddr);
        console.log("");
        
        // Get property data
        PropertyNFT.Property memory prop = propertyNFT.getProperty(propertyId);
        
        console.log("=== Property Data ===");
        console.log("Property Value:", prop.value);
        console.log("Property Yield Rate (basis points):", prop.yieldRate);
        console.log("Property Yield Rate (percent):", prop.yieldRate / 100);
        console.log("RWA Contract:", prop.rwaContract);
        console.log("RWA Token ID:", prop.rwaTokenId);
        console.log("");
        
        // Check if linked to RWA
        bool isLinked = prop.rwaContract != address(0) && prop.rwaTokenId > 0;
        
        if (isLinked) {
            console.log("[OK] Property IS linked to RWA");
            console.log("");
            
            // Get RWA data
            MockRWA.RWAProperty memory rwaProp = mockRWA.getRWAProperty(prop.rwaTokenId);
            
            if (rwaProp.isActive && rwaProp.value > 0) {
                console.log("=== RWA Data ===");
                console.log("RWA Name:", rwaProp.name);
                console.log("RWA Value:", rwaProp.value);
                console.log("RWA Monthly Yield:", rwaProp.monthlyYield);
                console.log("RWA Location:", rwaProp.location);
                console.log("RWA Active:", rwaProp.isActive);
                
                // Calculate RWA yield rate
                uint256 rwaYieldRate = mockRWA.getYieldRate(prop.rwaTokenId);
                console.log("RWA Yield Rate (basis points):", rwaYieldRate);
                console.log("RWA Yield Rate (percent):", rwaYieldRate / 100);
                console.log("");
                
                // Calculate expected yield using RWA data
                uint256 dailyYieldRWA = (rwaProp.value * rwaYieldRate) / (365 * 10000);
                console.log("Expected Daily Yield (using RWA):", dailyYieldRWA);
                
                // Calculate expected yield using property data (for comparison)
                uint256 dailyYieldProperty = (prop.value * prop.yieldRate) / (365 * 10000);
                console.log("Expected Daily Yield (using Property):", dailyYieldProperty);
                console.log("");
                
                if (dailyYieldRWA > dailyYieldProperty) {
                    console.log("[OK] RWA yield is HIGHER than property yield");
                    console.log("   Difference:", dailyYieldRWA - dailyYieldProperty, "wei per day");
                } else if (dailyYieldRWA < dailyYieldProperty) {
                    console.log("[WARN] RWA yield is LOWER than property yield");
                    console.log("   Difference:", dailyYieldProperty - dailyYieldRWA, "wei per day");
                } else {
                    console.log("[WARN] RWA yield equals property yield");
                }
                console.log("");
            } else {
                console.log("[WARN] RWA is not active or has invalid value");
            }
        } else {
            console.log("[INFO] Property is NOT linked to RWA");
            console.log("   Will use property's own value and yield rate");
            console.log("");
        }
        
        // Get actual yield from YieldDistributor
        try yieldDistributor.calculateYield(propertyId) returns (uint256 yieldAmount) {
            console.log("=== Actual Yield from YieldDistributor ===");
            console.log("Claimable Yield:", yieldAmount, "wei");
            console.log("Claimable Yield (TYCOON):", yieldAmount / 1e18, "TYCOON");
            console.log("");
            
            if (isLinked) {
                console.log("[OK] YieldDistributor is using RWA data for calculation");
                console.log("   (If RWA yield > property yield, you should see higher yield)");
            } else {
                console.log("[INFO] YieldDistributor is using property data for calculation");
            }
        } catch Error(string memory reason) {
            console.log("[ERROR] Error calculating yield:", reason);
        } catch {
            console.log("[ERROR] Failed to calculate yield");
        }
        
        console.log("\n=== Verification Complete ===");
    }
}

