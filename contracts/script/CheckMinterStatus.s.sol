// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {GameToken} from "../src/GameToken.sol";

/**
 * @notice Check if YieldDistributor is set as minter in GameToken
 * @dev Run this to verify minter status before claiming yield
 */
contract CheckMinterStatus is Script {
    function run() external view {
        address gameTokenAddress = vm.envAddress("GAME_TOKEN_ADDRESS");
        address yieldDistributorAddress = vm.envAddress("YIELD_DISTRIBUTOR_ADDRESS");
        
        console.log("==========================================");
        console.log("Checking Minter Status");
        console.log("==========================================");
        console.log("GameToken address:", gameTokenAddress);
        console.log("YieldDistributor address:", yieldDistributorAddress);
        
        GameToken gameToken = GameToken(gameTokenAddress);
        
        bool isMinter = gameToken.minters(yieldDistributorAddress);
        console.log("\nYieldDistributor is minter:", isMinter);
        
        if (!isMinter) {
            console.log("\nERROR: YieldDistributor is NOT set as minter!");
            console.log("Run SetupMinter.s.sol to fix this:");
            console.log("forge script script/SetupMinter.s.sol --rpc-url $RPC_URL --broadcast");
        } else {
            console.log("\nSUCCESS: YieldDistributor is authorized to mint tokens");
        }
        
        address owner = gameToken.owner();
        console.log("\nGameToken owner:", owner);
    }
}

