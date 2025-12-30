// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MockRWA} from "../src/MockRWA.sol";

/**
 * @title MintRWAForAddresses
 * @notice Script to mint RWA properties to different addresses
 * @dev Edit the addresses array below to specify recipients
 * 
 * Usage:
 * 1. Edit the addresses array in this script
 * 2. Set MOCK_RWA_ADDRESS in .env
 * 3. Run: forge script script/MintRWAForAddresses.s.sol:MintRWAForAddresses --rpc-url $MANTLE_RPC_URL --broadcast
 */
contract MintRWAForAddresses is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Get MockRWA contract address from environment
        address mockRWAAddress = vm.envOr("MOCK_RWA_ADDRESS", address(0));
        require(mockRWAAddress != address(0), "MOCK_RWA_ADDRESS not set in .env");
        
        MockRWA mockRWA = MockRWA(mockRWAAddress);
        
        console.log("Minting RWA properties to different addresses...");
        console.log("MockRWA Contract:", mockRWAAddress);
        
        // EDIT THIS ARRAY: Add addresses you want to mint RWA properties to
        address[] memory recipients = new address[](3);
        recipients[0] = 0x3210607AC8126770E850957cE7373ee7e59e3A29; // Address 1
        recipients[1] = 0xcbA548De848baE1968583b2502f44c46539453A8; // Address 2
        recipients[2] = 0x63AB0CA2bDa77a4432C2a13285BFD1f7258646e1; // Address 3
        
        // Property configurations
        string[] memory names = new string[](3);
        names[0] = "NYC Apartment #42";
        names[1] = "Commercial Building #15";
        names[2] = "Industrial Warehouse #8";
        
        uint256[] memory values = new uint256[](3);
        values[0] = 1000000 * 10**18;  // $1M
        values[1] = 2000000 * 10**18;  // $2M
        values[2] = 5000000 * 10**18;  // $5M
        
        uint256[] memory monthlyYields = new uint256[](3);
        monthlyYields[0] = 5000 * 10**18;   // $5K/month
        monthlyYields[1] = 15000 * 10**18;  // $15K/month
        monthlyYields[2] = 50000 * 10**18;  // $50K/month
        
        string[] memory locations = new string[](3);
        locations[0] = "New York, NY";
        locations[1] = "Los Angeles, CA";
        locations[2] = "Chicago, IL";
        
        // Mint properties to each address
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient address");
            
            uint256 tokenId = mockRWA.mintRWAProperty(
                recipients[i],
                names[i],
                values[i],
                monthlyYields[i],
                locations[i]
            );
            
            console.log("Minted RWA token", tokenId, "to", recipients[i]);
        }
        
        console.log("Minting complete! Total properties minted:", recipients.length);
        vm.stopBroadcast();
    }
}
