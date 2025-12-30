// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PropertyNFT} from "../src/PropertyNFT.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";
import {MockRWA} from "../src/MockRWA.sol";

/**
 * @title CheckPropertyLink
 * @notice Quick script to check if a property is linked to RWA and what yield it calculates
 */
contract CheckPropertyLink is Script {
    function run() external view {
        address propertyNFTAddr = vm.envOr("PROPERTY_NFT_ADDRESS", address(0));
        address yieldDistributorAddr = vm.envOr("YIELD_DISTRIBUTOR_ADDRESS", address(0));
        address mockRWAAddr = vm.envOr("MOCK_RWA_ADDRESS", address(0));
        uint256 propertyId = vm.envOr("PROPERTY_ID", uint256(0));
        
        require(propertyNFTAddr != address(0), "PROPERTY_NFT_ADDRESS not set");
        require(yieldDistributorAddr != address(0), "YIELD_DISTRIBUTOR_ADDRESS not set");
        require(mockRWAAddr != address(0), "MOCK_RWA_ADDRESS not set");
        require(propertyId > 0, "PROPERTY_ID not set");
        
        PropertyNFT propertyNFT = PropertyNFT(propertyNFTAddr);
        YieldDistributor yieldDistributor = YieldDistributor(yieldDistributorAddr);
        MockRWA mockRWA = MockRWA(mockRWAAddr);
        
        console.log("=== Checking Property Link ===");
        console.log("Property ID:", propertyId);
        console.log("");
        
        // Get property data
        PropertyNFT.Property memory prop = propertyNFT.getProperty(propertyId);
        
        console.log("Property Value:", prop.value);
        console.log("Property Yield Rate:", prop.yieldRate);
        console.log("RWA Contract:", prop.rwaContract);
        console.log("RWA Token ID:", prop.rwaTokenId);
        console.log("");
        
        // Check if linked
        bool isLinked = prop.rwaContract != address(0) && prop.rwaTokenId > 0;
        console.log("Is Linked to RWA:", isLinked ? "YES" : "NO");
        console.log("");
        
        if (isLinked) {
            console.log("Property IS linked. Checking RWA data...");
            
            // Get RWA data directly (no try-catch needed for view function)
            MockRWA.RWAProperty memory rwaProp = mockRWA.getRWAProperty(prop.rwaTokenId);
            
            if (rwaProp.isActive && rwaProp.value > 0) {
                console.log("RWA Name:", rwaProp.name);
                console.log("RWA Value:", rwaProp.value);
                console.log("RWA Monthly Yield:", rwaProp.monthlyYield);
                console.log("RWA Active:", rwaProp.isActive);
                
                uint256 rwaYieldRate = mockRWA.getYieldRate(prop.rwaTokenId);
                console.log("RWA Yield Rate:", rwaYieldRate);
                console.log("");
                
                // Calculate what yield SHOULD be using RWA
                uint256 dailyYieldRWA = (rwaProp.value * rwaYieldRate) / (365 * 10000);
                console.log("Expected Daily Yield (RWA):", dailyYieldRWA);
                
                // Calculate what yield would be using property
                uint256 dailyYieldProperty = (prop.value * prop.yieldRate) / (365 * 10000);
                console.log("Expected Daily Yield (Property):", dailyYieldProperty);
                console.log("");
            } else {
                console.log("WARNING: RWA is not active or has invalid value");
            }
        }
        
        // Get actual yield from YieldDistributor
        try yieldDistributor.calculateYield(propertyId) returns (uint256 yieldAmount) {
            console.log("=== Actual Yield from YieldDistributor ===");
            console.log("Yield Amount:", yieldAmount);
            console.log("Yield Amount (TYCOON):", yieldAmount / 1e18);
            console.log("");
            
            if (isLinked) {
                // Calculate expected using property data
                uint256 timeSinceUpdate = block.timestamp - prop.createdAt;
                if (timeSinceUpdate > 365 days) timeSinceUpdate = 365 days;
                uint256 periods = timeSinceUpdate / 1 days;
                if (periods > 365) periods = 365;
                
                uint256 dailyYieldProperty = (prop.value * prop.yieldRate) / (365 * 10000);
                uint256 expectedPropertyYield = dailyYieldProperty * periods;
                
                console.log("Expected Yield (using Property data):", expectedPropertyYield);
                console.log("Actual Yield:", yieldAmount);
                console.log("");
                
                if (yieldAmount > expectedPropertyYield) {
                    console.log("[OK] Yield is HIGHER than property yield - RWA is being used!");
                } else if (yieldAmount == expectedPropertyYield) {
                    console.log("[WARN] Yield equals property yield - RWA might not be used");
                } else {
                    console.log("[ERROR] Yield is LOWER - something is wrong");
                }
            }
        } catch Error(string memory reason) {
            console.log("ERROR calculating yield:", reason);
        } catch {
            console.log("ERROR: Failed to calculate yield");
        }
    }
}

