// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Marketplace} from "../src/Marketplace.sol";
import {PropertyNFT} from "../src/PropertyNFT.sol";

/**
 * @notice Check which PropertyNFT address the Marketplace contract is using
 */
contract CheckMarketplacePropertyNFT is Script {
    function run() external {
        address marketplaceAddress = vm.envAddress("MARKETPLACE_ADDRESS");
        address expectedPropertyNFT = vm.envAddress("PROPERTY_NFT_ADDRESS");
        
        console.log("==========================================");
        console.log("Checking Marketplace PropertyNFT Address");
        console.log("==========================================");
        console.log("Marketplace Address:", marketplaceAddress);
        console.log("Expected PropertyNFT:", expectedPropertyNFT);
        
        Marketplace marketplace = Marketplace(marketplaceAddress);
        address actualPropertyNFT = address(marketplace.propertyNFT());
        
        console.log("Actual PropertyNFT in Marketplace:", actualPropertyNFT);
        
        if (actualPropertyNFT == expectedPropertyNFT) {
            console.log("SUCCESS: Marketplace is using the CORRECT PropertyNFT address");
        } else {
            console.log("ERROR: Marketplace is using the WRONG PropertyNFT address!");
            console.log("Marketplace needs to be redeployed with the new PropertyNFT address");
        }
        
        // Also verify the PropertyNFT contract exists
        PropertyNFT propertyNFT = PropertyNFT(actualPropertyNFT);
        try propertyNFT.name() returns (string memory) {
            console.log("SUCCESS: PropertyNFT contract exists and is accessible");
        } catch {
            console.log("ERROR: PropertyNFT contract does not exist or is not accessible");
        }
    }
}

