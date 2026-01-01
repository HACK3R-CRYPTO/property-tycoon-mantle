// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PropertyNFT} from "../src/PropertyNFT.sol";
import {GameToken} from "../src/GameToken.sol";

/**
 * @title RedeployPropertyNFT
 * @notice Redeploy PropertyNFT with propertyCosts initialized in constructor
 */
contract RedeployPropertyNFT is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("==========================================");
        console.log("Redeploying PropertyNFT");
        console.log("==========================================");
        
        // Deploy new PropertyNFT (constructor will initialize propertyCosts)
        PropertyNFT propertyNFT = new PropertyNFT();
        console.log("New PropertyNFT deployed at:", address(propertyNFT));
        
        // Set GameToken address
        address gameTokenAddress = vm.envAddress("GAME_TOKEN_ADDRESS");
        propertyNFT.setGameToken(gameTokenAddress);
        console.log("GameToken set to:", gameTokenAddress);
        
        // Verify propertyCosts are initialized
        console.log("\nVerifying propertyCosts...");
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
        console.log("PropertyNFT redeployed successfully!");
        console.log("==========================================");
        console.log("\nNew PropertyNFT Address:", address(propertyNFT));
        console.log("\nNext Steps:");
        console.log("1. Update frontend/.env.local with new address");
        console.log("2. Update backend/.env with new address");
        console.log("3. Update frontend/src/lib/contracts.ts with new address");
        console.log("4. Update YieldDistributor to use new PropertyNFT address");
        console.log("5. Update Marketplace to use new PropertyNFT address");
        
        vm.stopBroadcast();
    }
}






