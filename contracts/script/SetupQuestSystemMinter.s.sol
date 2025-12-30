// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {GameToken} from "../src/GameToken.sol";

/**
 * @notice Set QuestSystem as minter in GameToken
 * @dev Run this after deploying QuestSystem
 */
contract SetupQuestSystemMinter is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address gameTokenAddress = vm.envAddress("GAME_TOKEN_ADDRESS");
        address questSystemAddress = vm.envAddress("QUEST_SYSTEM_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Setting QuestSystem as minter in GameToken...");
        console.log("GameToken address:", gameTokenAddress);
        console.log("QuestSystem address:", questSystemAddress);
        
        GameToken gameToken = GameToken(gameTokenAddress);
        gameToken.setMinter(questSystemAddress, true);
        
        bool isMinter = gameToken.minters(questSystemAddress);
        console.log("QuestSystem is minter:", isMinter);
        require(isMinter, "Failed to set minter");
        
        console.log("Successfully set QuestSystem as minter!");
        
        vm.stopBroadcast();
    }
}


