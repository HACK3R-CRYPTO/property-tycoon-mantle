// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PropertyNFT} from "../src/PropertyNFT.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";
import {MockRWA} from "../src/MockRWA.sol";

/**
 * @title VerifyPropertyLink
 * @notice Verify if a property is actually linked to RWA on-chain
 */
contract VerifyPropertyLink is Script {
    function run() external view {
        address propertyNFTAddr = vm.envOr("PROPERTY_NFT_ADDRESS", address(0));
        address yieldDistributorAddr = vm.envOr("YIELD_DISTRIBUTOR_ADDRESS", address(0));
        address mockRWAAddr = vm.envOr("MOCK_RWA_ADDRESS", address(0));
        uint256 propertyId = vm.envOr("PROPERTY_ID", uint256(1));
        
        require(propertyNFTAddr != address(0), "PROPERTY_NFT_ADDRESS not set");
        require(yieldDistributorAddr != address(0), "YIELD_DISTRIBUTOR_ADDRESS not set");
        require(mockRWAAddr != address(0), "MOCK_RWA_ADDRESS not set");
        
        PropertyNFT propertyNFT = PropertyNFT(propertyNFTAddr);
        YieldDistributor yieldDistributor = YieldDistributor(yieldDistributorAddr);
        MockRWA mockRWA = MockRWA(mockRWAAddr);
        
        console.log("=== Verifying Property Link ===");
        console.log("Property ID:", propertyId);
        console.log("");
        
        // Check if property exists
        try propertyNFT.ownerOf(propertyId) returns (address owner) {
            console.log("Property Owner:", owner);
        } catch {
            console.log("ERROR: Property does not exist!");
            return;
        }
        
        // Get property data
        PropertyNFT.Property memory prop = propertyNFT.getProperty(propertyId);
        
        console.log("=== Property Data ===");
        console.log("Property Value:", prop.value);
        console.log("Property Yield Rate:", prop.yieldRate);
        console.log("RWA Contract:", prop.rwaContract);
        console.log("RWA Token ID:", prop.rwaTokenId);
        console.log("");
        
        // Check if linked
        bool isLinked = prop.rwaContract != address(0) && prop.rwaTokenId > 0;
        console.log("Is Linked to RWA:", isLinked ? "YES" : "NO");
        console.log("");
        
        if (!isLinked) {
            console.log("PROPERTY IS NOT LINKED TO RWA!");
            console.log("You need to call linkToRWA() on PropertyNFT contract");
            return;
        }
        
        // Verify RWA exists
        console.log("=== Verifying RWA ===");
        console.log("RWA Contract Address:", prop.rwaContract);
        console.log("RWA Token ID:", prop.rwaTokenId);
        console.log("");
        
        // Check if RWA token exists
        try mockRWA.ownerOf(prop.rwaTokenId) returns (address rwaOwner) {
            console.log("RWA Owner:", rwaOwner);
        } catch {
            console.log("ERROR: RWA token does not exist!");
            console.log("The RWA token ID", prop.rwaTokenId, "does not exist in MockRWA contract");
            return;
        }
        
        // Get RWA data using public mapping
        try mockRWA.properties(prop.rwaTokenId) returns (
            string memory name,
            uint256 value,
            uint256 monthlyYield,
            string memory location,
            uint256 createdAt,
            bool isActive
        ) {
            console.log("RWA Name:", name);
            console.log("RWA Value:", value);
            console.log("RWA Monthly Yield:", monthlyYield);
            console.log("RWA Location:", location);
            console.log("RWA Active:", isActive);
            console.log("");
            
            if (!isActive) {
                console.log("WARNING: RWA is not active!");
            }
            
            if (value == 0) {
                console.log("WARNING: RWA value is 0!");
            }
            
            // Get yield rate
            uint256 rwaYieldRate = mockRWA.getYieldRate(prop.rwaTokenId);
            console.log("RWA Yield Rate (basis points):", rwaYieldRate);
            console.log("RWA Yield Rate (percent):", rwaYieldRate / 100);
            console.log("");
        } catch {
            console.log("ERROR: Failed to fetch RWA data");
            return;
        }
        
        // Test calculateYield
        console.log("=== Testing Yield Calculation ===");
        try yieldDistributor.calculateYield(propertyId) returns (uint256 yieldAmount) {
            console.log("Yield Amount (wei):", yieldAmount);
            console.log("Yield Amount (TYCOON):", yieldAmount / 1e18);
            console.log("");
            console.log("SUCCESS: Yield calculation works!");
        } catch Error(string memory reason) {
            console.log("ERROR calculating yield:", reason);
        } catch {
            console.log("ERROR: calculateYield reverted");
        }
    }
}



