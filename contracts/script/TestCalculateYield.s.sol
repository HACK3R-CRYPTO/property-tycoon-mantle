// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";
import {PropertyNFT} from "../src/PropertyNFT.sol";
import {MockRWA} from "../src/MockRWA.sol";

/**
 * @notice Test calculateYield for property #1 to debug the revert
 */
contract TestCalculateYield is Script {
    function run() external view {
        address yieldDistributorAddress = vm.envAddress("YIELD_DISTRIBUTOR_ADDRESS");
        address propertyNFTAddress = vm.envAddress("PROPERTY_NFT_ADDRESS");
        address mockRWAAddress = vm.envAddress("MOCK_RWA_ADDRESS");
        uint256 propertyId = 1;
        
        YieldDistributor yieldDistributor = YieldDistributor(yieldDistributorAddress);
        PropertyNFT propertyNFT = PropertyNFT(propertyNFTAddress);
        MockRWA mockRWA = MockRWA(mockRWAAddress);
        
        console.log("=== Testing calculateYield for Property #1 ===");
        console.log("");
        
        // Get property details
        PropertyNFT.Property memory prop = propertyNFT.getProperty(propertyId);
        console.log("Property Type:", uint256(prop.propertyType));
        console.log("Property Value:", prop.value);
        console.log("Property Yield Rate:", prop.yieldRate);
        console.log("RWA Contract:", prop.rwaContract);
        console.log("RWA Token ID:", prop.rwaTokenId);
        console.log("Created At:", prop.createdAt);
        console.log("Is Active:", prop.isActive);
        console.log("");
        
        // Check RWA data
        if (prop.rwaContract != address(0) && prop.rwaTokenId > 0) {
            console.log("=== RWA Data ===");
            try mockRWA.getRWAProperty(prop.rwaTokenId) returns (MockRWA.RWAProperty memory rwaProp) {
                console.log("RWA Name:", rwaProp.name);
                console.log("RWA Value:", rwaProp.value);
                console.log("RWA Monthly Yield:", rwaProp.monthlyYield);
                console.log("RWA Location:", rwaProp.location);
                console.log("RWA Created At:", rwaProp.createdAt);
                console.log("RWA Is Active:", rwaProp.isActive);
                console.log("");
                
                // Get yield rate
                try mockRWA.getYieldRate(prop.rwaTokenId) returns (uint256 yieldRate) {
                    console.log("RWA Yield Rate:", yieldRate);
                } catch {
                    console.log("ERROR: Failed to get RWA yield rate");
                }
            } catch {
                console.log("ERROR: Failed to get RWA property");
            }
        }
        
        // Check YieldDistributor state
        console.log("=== YieldDistributor State ===");
        uint256 lastUpdate = yieldDistributor.lastYieldUpdate(propertyId);
        uint256 pending = yieldDistributor.pendingYield(propertyId);
        console.log("Last Yield Update:", lastUpdate);
        console.log("Pending Yield:", pending);
        console.log("");
        
        // Get current block timestamp
        console.log("Current Block Timestamp:", block.timestamp);
        console.log("Time Since Creation:", block.timestamp - prop.createdAt);
        console.log("Time Since Last Update:", lastUpdate > 0 ? block.timestamp - lastUpdate : block.timestamp - prop.createdAt);
        console.log("");
        
        // Try to calculate yield
        console.log("=== Attempting calculateYield ===");
        try yieldDistributor.calculateYield(propertyId) returns (uint256 yieldAmount) {
            console.log("SUCCESS! Yield Amount:", yieldAmount);
            console.log("Yield Amount (TYCOON):", yieldAmount / 1e18);
        } catch Error(string memory reason) {
            console.log("ERROR (string):", reason);
        } catch (bytes memory lowLevelData) {
            console.log("ERROR (bytes):");
            console.logBytes(lowLevelData);
        }
    }
}





import {Script, console} from "forge-std/Script.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";
import {PropertyNFT} from "../src/PropertyNFT.sol";
import {MockRWA} from "../src/MockRWA.sol";

/**
 * @notice Test calculateYield for property #1 to debug the revert
 */
contract TestCalculateYield is Script {
    function run() external view {
        address yieldDistributorAddress = vm.envAddress("YIELD_DISTRIBUTOR_ADDRESS");
        address propertyNFTAddress = vm.envAddress("PROPERTY_NFT_ADDRESS");
        address mockRWAAddress = vm.envAddress("MOCK_RWA_ADDRESS");
        uint256 propertyId = 1;
        
        YieldDistributor yieldDistributor = YieldDistributor(yieldDistributorAddress);
        PropertyNFT propertyNFT = PropertyNFT(propertyNFTAddress);
        MockRWA mockRWA = MockRWA(mockRWAAddress);
        
        console.log("=== Testing calculateYield for Property #1 ===");
        console.log("");
        
        // Get property details
        PropertyNFT.Property memory prop = propertyNFT.getProperty(propertyId);
        console.log("Property Type:", uint256(prop.propertyType));
        console.log("Property Value:", prop.value);
        console.log("Property Yield Rate:", prop.yieldRate);
        console.log("RWA Contract:", prop.rwaContract);
        console.log("RWA Token ID:", prop.rwaTokenId);
        console.log("Created At:", prop.createdAt);
        console.log("Is Active:", prop.isActive);
        console.log("");
        
        // Check RWA data
        if (prop.rwaContract != address(0) && prop.rwaTokenId > 0) {
            console.log("=== RWA Data ===");
            try mockRWA.getRWAProperty(prop.rwaTokenId) returns (MockRWA.RWAProperty memory rwaProp) {
                console.log("RWA Name:", rwaProp.name);
                console.log("RWA Value:", rwaProp.value);
                console.log("RWA Monthly Yield:", rwaProp.monthlyYield);
                console.log("RWA Location:", rwaProp.location);
                console.log("RWA Created At:", rwaProp.createdAt);
                console.log("RWA Is Active:", rwaProp.isActive);
                console.log("");
                
                // Get yield rate
                try mockRWA.getYieldRate(prop.rwaTokenId) returns (uint256 yieldRate) {
                    console.log("RWA Yield Rate:", yieldRate);
                } catch {
                    console.log("ERROR: Failed to get RWA yield rate");
                }
            } catch {
                console.log("ERROR: Failed to get RWA property");
            }
        }
        
        // Check YieldDistributor state
        console.log("=== YieldDistributor State ===");
        uint256 lastUpdate = yieldDistributor.lastYieldUpdate(propertyId);
        uint256 pending = yieldDistributor.pendingYield(propertyId);
        console.log("Last Yield Update:", lastUpdate);
        console.log("Pending Yield:", pending);
        console.log("");
        
        // Get current block timestamp
        console.log("Current Block Timestamp:", block.timestamp);
        console.log("Time Since Creation:", block.timestamp - prop.createdAt);
        console.log("Time Since Last Update:", lastUpdate > 0 ? block.timestamp - lastUpdate : block.timestamp - prop.createdAt);
        console.log("");
        
        // Try to calculate yield
        console.log("=== Attempting calculateYield ===");
        try yieldDistributor.calculateYield(propertyId) returns (uint256 yieldAmount) {
            console.log("SUCCESS! Yield Amount:", yieldAmount);
            console.log("Yield Amount (TYCOON):", yieldAmount / 1e18);
        } catch Error(string memory reason) {
            console.log("ERROR (string):", reason);
        } catch (bytes memory lowLevelData) {
            console.log("ERROR (bytes):");
            console.logBytes(lowLevelData);
        }
    }
}

