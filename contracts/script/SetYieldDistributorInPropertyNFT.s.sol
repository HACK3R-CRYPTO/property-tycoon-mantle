// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PropertyNFT} from "../src/PropertyNFT.sol";

/**
 * @title SetYieldDistributorInPropertyNFT
 * @notice Sets the YieldDistributor address in PropertyNFT contract
 * @dev This allows YieldDistributor to update totalYieldEarned
 * 
 * NOTE: This only works if PropertyNFT has been updated with the setYieldDistributor function.
 * If PropertyNFT is the old version, you'll need to either:
 * 1. Deploy a new PropertyNFT and migrate properties, OR
 * 2. Track totalYieldEarned in YieldDistributor instead
 */
contract SetYieldDistributorInPropertyNFT is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        address propertyNFTAddress = vm.envAddress("PROPERTY_NFT_ADDRESS");
        address yieldDistributorAddress = vm.envAddress("YIELD_DISTRIBUTOR_ADDRESS");
        
        console.log("Setting YieldDistributor in PropertyNFT...");
        console.log("PropertyNFT address:", propertyNFTAddress);
        console.log("YieldDistributor address:", yieldDistributorAddress);
        
        PropertyNFT propertyNFT = PropertyNFT(propertyNFTAddress);
        
        // Try to call setYieldDistributor (will fail if function doesn't exist)
        try propertyNFT.setYieldDistributor(yieldDistributorAddress) {
            console.log("Successfully set YieldDistributor in PropertyNFT");
            address setDistributor = propertyNFT.yieldDistributor();
            console.log("Verified YieldDistributor address:", setDistributor);
            require(setDistributor == yieldDistributorAddress, "Address mismatch");
        } catch {
            console.log("PropertyNFT does not have setYieldDistributor function");
            console.log("This means PropertyNFT is the old version.");
            console.log("Options:");
            console.log("1. Deploy new PropertyNFT with updateTotalYieldEarned function");
            console.log("2. Track totalYieldEarned in YieldDistributor instead");
            revert("PropertyNFT version incompatible");
        }
        
        vm.stopBroadcast();
    }
}

