// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PropertyNFT} from "../src/PropertyNFT.sol";
import {GameToken} from "../src/GameToken.sol";

/**
 * @notice Test property minting flow
 * @dev Simulates the full minting process to identify issues
 */
contract TestMinting is Script {
    function run() external view {
        address propertyNFTAddress = vm.envAddress("PROPERTY_NFT_ADDRESS");
        address gameTokenAddress = vm.envAddress("GAME_TOKEN_ADDRESS");
        address testAddress = vm.envAddress("TEST_ADDRESS");
        
        PropertyNFT propertyNFT = PropertyNFT(propertyNFTAddress);
        GameToken gameToken = GameToken(gameTokenAddress);
        
        console.log("=== Testing Property Minting ===");
        console.log("");
        console.log("PropertyNFT:", propertyNFTAddress);
        console.log("GameToken:", gameTokenAddress);
        console.log("Test Address:", testAddress);
        console.log("");
        
        // Check token balance
        uint256 balance = gameToken.balanceOf(testAddress);
        console.log("TYCOON Balance:", balance);
        console.log("TYCOON Balance (TYCOON):", balance / 1e18);
        console.log("");
        
        // Check allowance
        uint256 allowance = gameToken.allowance(testAddress, propertyNFTAddress);
        console.log("Allowance:", allowance);
        console.log("Allowance (TYCOON):", allowance / 1e18);
        console.log("");
        
        // Check property costs
        console.log("Property Costs:");
        uint256 residentialCost = propertyNFT.propertyCosts(PropertyNFT.PropertyType.Residential);
        uint256 commercialCost = propertyNFT.propertyCosts(PropertyNFT.PropertyType.Commercial);
        uint256 industrialCost = propertyNFT.propertyCosts(PropertyNFT.PropertyType.Industrial);
        uint256 luxuryCost = propertyNFT.propertyCosts(PropertyNFT.PropertyType.Luxury);
        
        console.log("  Residential:", residentialCost / 1e18, "TYCOON");
        console.log("  Commercial:", commercialCost / 1e18, "TYCOON");
        console.log("  Industrial:", industrialCost / 1e18, "TYCOON");
        console.log("  Luxury:", luxuryCost / 1e18, "TYCOON");
        console.log("");
        
        // Check if can mint Residential (cheapest)
        console.log("=== Can Mint Residential? ===");
        bool hasEnoughBalance = balance >= residentialCost;
        bool hasEnoughAllowance = allowance >= residentialCost;
        
        console.log("Has enough balance:", hasEnoughBalance);
        console.log("Has enough allowance:", hasEnoughAllowance);
        
        if (!hasEnoughBalance) {
            console.log("ERROR: Insufficient TYCOON balance");
            console.log("  Need:", residentialCost / 1e18, "TYCOON");
            console.log("  Have:", balance / 1e18, "TYCOON");
        }
        
        if (!hasEnoughAllowance) {
            console.log("ERROR: Insufficient allowance");
            console.log("  Need:", residentialCost / 1e18, "TYCOON");
            console.log("  Have:", allowance / 1e18, "TYCOON");
            console.log("  Solution: Approve PropertyNFT to spend tokens");
        }
        
        if (hasEnoughBalance && hasEnoughAllowance) {
            console.log("SUCCESS: Ready to mint! All requirements met.");
        }
        
        // Check GameToken is set in PropertyNFT
        address propertyNFTGameToken = address(propertyNFT.gameToken());
        console.log("");
        console.log("PropertyNFT gameToken:", propertyNFTGameToken);
        console.log("Expected gameToken:", gameTokenAddress);
        bool gameTokenSet = propertyNFTGameToken == gameTokenAddress;
        console.log("GameToken set correctly:", gameTokenSet);
        
        if (!gameTokenSet) {
            console.log("ERROR: GameToken not set in PropertyNFT");
        }
    }
}

