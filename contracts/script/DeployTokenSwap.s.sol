// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {TokenSwap} from "../src/TokenSwap.sol";
import {GameToken} from "../src/GameToken.sol";

contract DeployTokenSwap is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address gameTokenAddress = vm.envAddress("GAME_TOKEN_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying TokenSwap contract...");
        console.log("GameToken address:", gameTokenAddress);
        
        TokenSwap tokenSwap = new TokenSwap(gameTokenAddress);
        
        console.log("TokenSwap deployed at:", address(tokenSwap));
        console.log("Exchange rate: 1 MNT = 100 TYCOON");
        
        vm.stopBroadcast();
    }
}



