// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {GameToken} from "../src/GameToken.sol";

/**
 * @notice Set YieldDistributor as minter in GameToken
 * @dev Run this after deploying YieldDistributor
 */
contract SetupMinter is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address gameTokenAddress = vm.envAddress("GAME_TOKEN_ADDRESS");
        address yieldDistributorAddress = vm.envAddress("YIELD_DISTRIBUTOR_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Setting YieldDistributor as minter in GameToken...");
        console.log("GameToken address:", gameTokenAddress);
        console.log("YieldDistributor address:", yieldDistributorAddress);
        
        GameToken gameToken = GameToken(gameTokenAddress);
        gameToken.setMinter(yieldDistributorAddress, true);
        
        bool isMinter = gameToken.minters(yieldDistributorAddress);
        console.log("YieldDistributor is minter:", isMinter);
        require(isMinter, "Failed to set minter");
        
        console.log("Successfully set YieldDistributor as minter!");
        
        vm.stopBroadcast();
    }
}

