// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Marketplace} from "../src/Marketplace.sol";
import {PropertyNFT} from "../src/PropertyNFT.sol";

/**
 * @title CheckOldMarketplaceScript
 * @notice Check which properties are in the old marketplace
 */
contract CheckOldMarketplaceScript is Script {
    function run() external {
        address oldMarketplaceAddress = vm.envAddress("OLD_MARKETPLACE_ADDRESS");
        address propertyNFTAddress = vm.envAddress("PROPERTY_NFT_ADDRESS");
        
        console.log("Checking old marketplace:", oldMarketplaceAddress);
        console.log("PropertyNFT address:", propertyNFTAddress);
        
        Marketplace oldMarketplace = Marketplace(payable(oldMarketplaceAddress));
        PropertyNFT propertyNFT = PropertyNFT(propertyNFTAddress);
        
        // Try to get active listings count
        try oldMarketplace.getActiveListingsCount() returns (uint256 count) {
            console.log("Active listings count:", count);
            
            if (count > 0) {
                // Get active listings
                (uint256[] memory propertyIds, address[] memory sellers, uint256[] memory prices) = 
                    oldMarketplace.getActiveListings();
                
                console.log("\nActive Listings:");
                for (uint256 i = 0; i < propertyIds.length; i++) {
                    console.log("Property ID:", propertyIds[i]);
                    console.log("  Seller:", sellers[i]);
                    console.log("  Price:", prices[i]);
                    console.log("");
                }
            }
        } catch {
            console.log("getActiveListingsCount() not available, checking properties owned by marketplace...");
            
            // Get properties owned by marketplace
            uint256[] memory ownedProperties = propertyNFT.getOwnerProperties(oldMarketplaceAddress);
            console.log("Properties owned by old marketplace:", ownedProperties.length);
            
            for (uint256 i = 0; i < ownedProperties.length; i++) {
                uint256 propertyId = ownedProperties[i];
                console.log("Property ID:", propertyId);
                
                // Check if it's listed
                try oldMarketplace.listings(propertyId) returns (
                    uint256,
                    address seller,
                    uint256 price,
                    bool isActive,
                    uint256
                ) {
                    if (isActive) {
                        console.log("  Status: ACTIVE LISTING");
                        console.log("  Seller:", seller);
                        console.log("  Price:", price);
                    } else {
                        console.log("  Status: NOT ACTIVE (may need recovery)");
                    }
                } catch {
                    console.log("  Status: Could not check listing status");
                }
                console.log("");
            }
        }
    }
}







