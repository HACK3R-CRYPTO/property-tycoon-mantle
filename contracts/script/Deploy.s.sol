// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {GameToken} from "../src/GameToken.sol";
import {PropertyNFT} from "../src/PropertyNFT.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";
import {Marketplace} from "../src/Marketplace.sol";
import {QuestSystem} from "../src/QuestSystem.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying Property Tycoon contracts to Mantle...");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        
        GameToken gameToken = new GameToken();
        console.log("GameToken deployed at:", address(gameToken));
        
        PropertyNFT propertyNFT = new PropertyNFT();
        console.log("PropertyNFT deployed at:", address(propertyNFT));
        
        YieldDistributor yieldDistributor = new YieldDistributor(
            address(propertyNFT),
            address(gameToken)
        );
        console.log("YieldDistributor deployed at:", address(yieldDistributor));
        
        Marketplace marketplace = new Marketplace(
            address(propertyNFT),
            address(gameToken)
        );
        console.log("Marketplace deployed at:", address(marketplace));
        
        QuestSystem questSystem = new QuestSystem(
            address(propertyNFT),
            address(gameToken)
        );
        console.log("QuestSystem deployed at:", address(questSystem));
        
        console.log("\n=== Deployment Summary ===");
        console.log("GameToken:", address(gameToken));
        console.log("PropertyNFT:", address(propertyNFT));
        console.log("YieldDistributor:", address(yieldDistributor));
        console.log("Marketplace:", address(marketplace));
        console.log("QuestSystem:", address(questSystem));
        
        vm.stopBroadcast();
    }
}
