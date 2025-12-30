// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {QuestSystem} from "../src/QuestSystem.sol";
import {GameToken} from "../src/GameToken.sol";

/**
 * @title RedeployQuestSystem
 * @notice Redeploy QuestSystem to a new address (old one was overwritten by PropertyNFT)
 */
contract RedeployQuestSystem is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        // Use new PropertyNFT address (hardcoded since .env might be outdated)
        address propertyNFTAddress = vm.envOr("PROPERTY_NFT_ADDRESS", 0x1A9890B59E7DD74dA063adB3f9f6262379fE5c2A);
        address gameTokenAddress = vm.envAddress("GAME_TOKEN_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("==========================================");
        console.log("Redeploying QuestSystem");
        console.log("==========================================");
        console.log("PropertyNFT Address:", propertyNFTAddress);
        console.log("GameToken Address:", gameTokenAddress);
        
        // Deploy new QuestSystem
        QuestSystem questSystem = new QuestSystem(propertyNFTAddress, gameTokenAddress);
        console.log("New QuestSystem deployed at:", address(questSystem));
        
        // Set QuestSystem as minter in GameToken
        GameToken gameToken = GameToken(gameTokenAddress);
        gameToken.setMinter(address(questSystem), true);
        bool isMinter = gameToken.minters(address(questSystem));
        console.log("QuestSystem is minter:", isMinter);
        require(isMinter, "Failed to set QuestSystem as minter");
        
        console.log("\n==========================================");
        console.log("QuestSystem redeployed successfully!");
        console.log("==========================================");
        console.log("\nNew QuestSystem Address:", address(questSystem));
        console.log("\nNext Steps:");
        console.log("1. Update frontend/.env.local with new address");
        console.log("2. Update backend/.env with new address");
        console.log("3. Update frontend/src/lib/contracts.ts with new address");
        
        vm.stopBroadcast();
    }
}

