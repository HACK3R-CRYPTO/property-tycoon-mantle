// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";
import {PropertyNFT} from "../src/PropertyNFT.sol";
import {GameToken} from "../src/GameToken.sol";
import {MockRWA} from "../src/MockRWA.sol";

/**
 * @notice Test claimYield for RWA-linked property
 */
contract TestClaimYield is Script {
    function run() external view {
        address yieldDistributorAddress = vm.envAddress("YIELD_DISTRIBUTOR_ADDRESS");
        address propertyNFTAddress = vm.envAddress("PROPERTY_NFT_ADDRESS");
        address gameTokenAddress = vm.envAddress("GAME_TOKEN_ADDRESS");
        address mockRWAAddress = vm.envAddress("MOCK_RWA_ADDRESS");
        address testAddress = vm.envAddress("TEST_ADDRESS");
        uint256 propertyId = 1;
        
        YieldDistributor yieldDistributor = YieldDistributor(yieldDistributorAddress);
        PropertyNFT propertyNFT = PropertyNFT(propertyNFTAddress);
        GameToken gameToken = GameToken(gameTokenAddress);
        MockRWA mockRWA = MockRWA(mockRWAAddress);
        
        console.log("=== Testing RWA-Linked Yield Claiming ===");
        console.log("");
        
        // Check property ownership
        address owner = propertyNFT.ownerOf(propertyId);
        console.log("Property Owner:", owner);
        console.log("Test Address:", testAddress);
        console.log("Is Owner:", owner == testAddress);
        console.log("");
        
        if (owner != testAddress) {
            console.log("ERROR: Test address is not the owner of property #1");
            return;
        }
        
        // Check property details
        PropertyNFT.Property memory prop = propertyNFT.getProperty(propertyId);
        console.log("Property Type:", uint256(prop.propertyType));
        console.log("Property Value:", prop.value);
        console.log("Property Yield Rate:", prop.yieldRate);
        console.log("RWA Contract:", prop.rwaContract);
        console.log("RWA Token ID:", prop.rwaTokenId);
        console.log("Is Linked to RWA:", prop.rwaContract != address(0) && prop.rwaTokenId > 0);
        console.log("");
        
        // Check RWA data if linked
        if (prop.rwaContract != address(0) && prop.rwaTokenId > 0) {
            console.log("=== RWA Data ===");
            try mockRWA.getRWAProperty(prop.rwaTokenId) returns (MockRWA.RWAProperty memory rwaProp) {
                console.log("RWA Name:", rwaProp.name);
                console.log("RWA Value:", rwaProp.value);
                console.log("RWA Monthly Yield:", rwaProp.monthlyYield);
                console.log("RWA Is Active:", rwaProp.isActive);
                
                uint256 rwaYieldRate = mockRWA.getYieldRate(prop.rwaTokenId);
                console.log("RWA Yield Rate:", rwaYieldRate, "basis points");
                console.log("");
            } catch {
                console.log("ERROR: Failed to get RWA data");
            }
        }
        
        // Check YieldDistributor state
        console.log("=== YieldDistributor State ===");
        uint256 lastUpdate = yieldDistributor.lastYieldUpdate(propertyId);
        uint256 pending = yieldDistributor.pendingYield(propertyId);
        console.log("Last Yield Update:", lastUpdate);
        console.log("Pending Yield:", pending);
        console.log("");
        
        // Check if can mint
        bool canMint = gameToken.minters(address(yieldDistributor));
        console.log("YieldDistributor can mint:", canMint);
        console.log("");
        
        // Calculate yield
        console.log("=== Yield Calculation ===");
        uint256 yieldAmount = 0;
        bool yieldCalculated = false;
        try yieldDistributor.calculateYield(propertyId) returns (uint256 calculatedYield) {
            yieldAmount = calculatedYield;
            yieldCalculated = true;
            console.log("Claimable Yield:", yieldAmount);
            console.log("Claimable Yield (TYCOON):", yieldAmount / 1e18);
            console.log("");
            
            if (yieldAmount == 0) {
                console.log("WARNING: No yield to claim");
                console.log("  - Property might need 24 hours to accumulate yield");
                console.log("  - Or yield was already claimed recently");
            } else {
                console.log("SUCCESS: Yield can be claimed!");
            }
        } catch Error(string memory reason) {
            console.log("ERROR calculating yield:", reason);
        } catch (bytes memory lowLevelData) {
            console.log("ERROR: calculateYield reverted");
            console.logBytes(lowLevelData);
        }
        
        console.log("");
        console.log("=== Summary ===");
        if (yieldCalculated) {
            console.log("Ready to claim:", canMint && yieldAmount > 0);
        } else {
            console.log("Cannot determine if ready to claim (yield calculation failed)");
        }
    }
}

