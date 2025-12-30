// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MockRWA} from "../src/MockRWA.sol";

contract DeployMockRWA is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying MockRWA contract...");
        
        MockRWA mockRWA = new MockRWA();
        
        console.log("MockRWA deployed at:", address(mockRWA));
        
        // Mint some test RWA properties for demo
        console.log("Minting test RWA properties...");
        
        // Property 1: NYC Apartment
        mockRWA.mintRWAProperty(
            msg.sender,
            "NYC Apartment #42",
            1000000 * 10**18,  // $1M value
            5000 * 10**18,     // $5K/month yield
            "New York, NY"
        );
        console.log("Minted: NYC Apartment #42");
        
        // Property 2: Commercial Building
        mockRWA.mintRWAProperty(
            msg.sender,
            "Commercial Building #15",
            2000000 * 10**18,  // $2M value
            15000 * 10**18,    // $15K/month yield
            "Los Angeles, CA"
        );
        console.log("Minted: Commercial Building #15");
        
        // Property 3: Industrial Warehouse
        mockRWA.mintRWAProperty(
            msg.sender,
            "Industrial Warehouse #8",
            5000000 * 10**18,  // $5M value
            50000 * 10**18,    // $50K/month yield
            "Chicago, IL"
        );
        console.log("Minted: Industrial Warehouse #8");
        
        // Property 4: Luxury Estate
        mockRWA.mintRWAProperty(
            msg.sender,
            "Luxury Estate #3",
            10000000 * 10**18, // $10M value
            125000 * 10**18,   // $125K/month yield
            "Miami, FL"
        );
        console.log("Minted: Luxury Estate #3");
        
        // Property 5: Residential Complex
        mockRWA.mintRWAProperty(
            msg.sender,
            "Residential Complex #12",
            3000000 * 10**18,  // $3M value
            20000 * 10**18,    // $20K/month yield
            "Seattle, WA"
        );
        console.log("Minted: Residential Complex #12");
        
        console.log("MockRWA deployment complete!");
        console.log("Contract Address:", address(mockRWA));
        console.log("Total RWA Properties Minted: 5");
        
        vm.stopBroadcast();
    }
}

