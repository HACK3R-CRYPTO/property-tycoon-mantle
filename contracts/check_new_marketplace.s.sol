// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Script, console} from "forge-std/Script.sol";
import {Marketplace} from "../src/Marketplace.sol";
contract CheckNewMarketplace is Script {
    function run() external {
        address marketplaceAddress = 0xe9E855ff6EB78055AaE90631468BfC948A1446Bb;
        address expectedPropertyNFT = 0xe1fF4f5f79D843208A0c70a0634a0CE4F034D697;
        Marketplace marketplace = Marketplace(marketplaceAddress);
        address actualPropertyNFT = address(marketplace.propertyNFT());
        console.log("Marketplace:", marketplaceAddress);
        console.log("Expected PropertyNFT:", expectedPropertyNFT);
        console.log("Actual PropertyNFT:", actualPropertyNFT);
        if (actualPropertyNFT == expectedPropertyNFT) {
            console.log("SUCCESS: Marketplace accepts NEW properties");
        } else {
            console.log("ERROR: Marketplace uses OLD PropertyNFT - needs redeployment");
        }
    }
}
