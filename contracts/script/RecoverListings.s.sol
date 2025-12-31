// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Marketplace} from "../src/Marketplace.sol";

/**
 * @title RecoverListingsScript
 * @notice Script to cancel listings and recover properties from marketplace
 * @dev Use this to cancel your listings and get your properties back
 */
contract RecoverListingsScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        address marketplaceAddress = vm.envAddress("MARKETPLACE_ADDRESS");
        console.log("Marketplace address:", marketplaceAddress);
        
        Marketplace marketplace = Marketplace(payable(marketplaceAddress));
        
        // Get all properties owned by marketplace
        // Note: You need to know which property IDs you listed
        // This script assumes you'll provide them via environment variable
        
        string memory propertyIdsStr = vm.envString("PROPERTY_IDS");
        console.log("Property IDs to recover:", propertyIdsStr);
        
        // Parse comma-separated property IDs
        string[] memory propertyIdStrings = vm.split(propertyIdsStr, ",");
        
        for (uint256 i = 0; i < propertyIdStrings.length; i++) {
            uint256 propertyId = vm.parseUint(propertyIdStrings[i]);
            console.log("Attempting to cancel listing for property ID:", propertyId);
            
            try marketplace.cancelListing(propertyId) {
                console.log("Successfully cancelled listing for property:", propertyId);
            } catch Error(string memory reason) {
                console.log("Failed to cancel property", propertyId, ":", reason);
            } catch (bytes memory) {
                console.log("Failed to cancel property", propertyId, ": Unknown error");
            }
        }
        
        vm.stopBroadcast();
    }
}





