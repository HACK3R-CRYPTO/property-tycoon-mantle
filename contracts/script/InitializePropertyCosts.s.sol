// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PropertyNFT} from "../src/PropertyNFT.sol";

/**
 * @title InitializePropertyCosts
 * @notice Script to initialize propertyCosts mapping in PropertyNFT contract
 * @dev Run this if propertyCosts were not set during deployment
 */
contract InitializePropertyCosts is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address propertyNFTAddress = vm.envAddress("PROPERTY_NFT_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("==========================================");
        console.log("Initializing Property Costs");
        console.log("==========================================");
        console.log("PropertyNFT Address:", propertyNFTAddress);
        
        PropertyNFT propertyNFT = PropertyNFT(propertyNFTAddress);
        
        // Set property costs (in TYCOON tokens with 18 decimals)
        console.log("\nSetting Residential cost: 100 TYCOON");
        propertyNFT.setPropertyCost(PropertyNFT.PropertyType.Residential, 100 * 10**18);
        
        console.log("Setting Commercial cost: 200 TYCOON");
        propertyNFT.setPropertyCost(PropertyNFT.PropertyType.Commercial, 200 * 10**18);
        
        console.log("Setting Industrial cost: 500 TYCOON");
        propertyNFT.setPropertyCost(PropertyNFT.PropertyType.Industrial, 500 * 10**18);
        
        console.log("Setting Luxury cost: 1000 TYCOON");
        propertyNFT.setPropertyCost(PropertyNFT.PropertyType.Luxury, 1000 * 10**18);
        
        // Verify costs were set
        console.log("\nVerifying costs...");
        uint256 residentialCost = propertyNFT.propertyCosts(PropertyNFT.PropertyType.Residential);
        uint256 commercialCost = propertyNFT.propertyCosts(PropertyNFT.PropertyType.Commercial);
        uint256 industrialCost = propertyNFT.propertyCosts(PropertyNFT.PropertyType.Industrial);
        uint256 luxuryCost = propertyNFT.propertyCosts(PropertyNFT.PropertyType.Luxury);
        
        console.log("Residential cost:", residentialCost);
        console.log("Commercial cost:", commercialCost);
        console.log("Industrial cost:", industrialCost);
        console.log("Luxury cost:", luxuryCost);
        
        require(residentialCost > 0, "Residential cost not set");
        require(commercialCost > 0, "Commercial cost not set");
        require(industrialCost > 0, "Industrial cost not set");
        require(luxuryCost > 0, "Luxury cost not set");
        
        console.log("\n==========================================");
        console.log("Property costs initialized successfully!");
        console.log("==========================================");
        
        vm.stopBroadcast();
    }
}






