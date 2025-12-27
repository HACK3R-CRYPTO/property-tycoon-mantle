// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";

contract DeployYieldDistributorScript is Script {
    // Existing deployed contract addresses (Mantle Sepolia Testnet)
    address constant PROPERTY_NFT = 0x0AE7119c7187D88643fb7B409937B68828eE733D;
    address constant GAME_TOKEN = 0x32D9a9b9e241Da421f34786De0B39fD34D1EfeA8;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying updated YieldDistributor to Mantle...");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Using existing PropertyNFT:", PROPERTY_NFT);
        console.log("Using existing GameToken:", GAME_TOKEN);
        
        YieldDistributor yieldDistributor = new YieldDistributor(
            PROPERTY_NFT,
            GAME_TOKEN
        );
        
        console.log("\n=== Deployment Summary ===");
        console.log("YieldDistributor deployed at:", address(yieldDistributor));
        console.log("\nUpdate your .env files with:");
        console.log("NEXT_PUBLIC_YIELD_DISTRIBUTOR_ADDRESS=", address(yieldDistributor));
        
        vm.stopBroadcast();
    }
}

