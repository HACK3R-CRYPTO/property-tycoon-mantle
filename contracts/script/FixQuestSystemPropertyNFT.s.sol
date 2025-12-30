// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {QuestSystem} from "../src/QuestSystem.sol";

/**
 * @title FixQuestSystemPropertyNFT
 * @notice Update QuestSystem to use the new PropertyNFT address
 */
contract FixQuestSystemPropertyNFT is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address questSystemAddress = vm.envAddress("QUEST_SYSTEM_ADDRESS");
        address newPropertyNFTAddress = vm.envAddress("PROPERTY_NFT_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("==========================================");
        console.log("Updating QuestSystem PropertyNFT Address");
        console.log("==========================================");
        console.log("QuestSystem Address:", questSystemAddress);
        console.log("New PropertyNFT Address:", newPropertyNFTAddress);
        
        QuestSystem questSystem = QuestSystem(questSystemAddress);
        
        // Check if QuestSystem has setPropertyNFT function
        // If not, we'll need to redeploy with correct address
        address currentPropertyNFT = address(questSystem.propertyNFT());
        console.log("Current PropertyNFT in QuestSystem:", currentPropertyNFT);
        
        if (currentPropertyNFT != newPropertyNFTAddress) {
            console.log("\nWARNING: QuestSystem is using old PropertyNFT address!");
            console.log("QuestSystem does not have a setter function.");
            console.log("You need to redeploy QuestSystem with the new PropertyNFT address.");
        } else {
            console.log("\nQuestSystem is already using the correct PropertyNFT address.");
        }
        
        vm.stopBroadcast();
    }
}




