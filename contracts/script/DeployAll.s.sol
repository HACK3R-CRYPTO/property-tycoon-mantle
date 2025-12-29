// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {GameToken} from "../src/GameToken.sol";
import {PropertyNFT} from "../src/PropertyNFT.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";
import {TokenSwap} from "../src/TokenSwap.sol";
import {QuestSystem} from "../src/QuestSystem.sol";

/**
 * @notice Deploy all updated contracts
 * @dev Run this script to deploy:
 * 1. Updated GameToken (with minter role)
 * 2. Updated PropertyNFT (with purchaseProperty)
 * 3. Updated YieldDistributor (minting yield)
 * 4. TokenSwap (for buying TYCOON with MNT)
 * 5. Setup minter role
 * 6. Setup PropertyNFT gameToken
 */
contract DeployAll is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("==========================================");
        console.log("Deploying Updated Contracts");
        console.log("==========================================");
        
        // Step 1: Deploy GameToken
        console.log("\n1. Deploying GameToken...");
        GameToken gameToken = new GameToken();
        console.log("GameToken deployed at:", address(gameToken));
        
        // Step 2: Deploy PropertyNFT
        console.log("\n2. Deploying PropertyNFT...");
        PropertyNFT propertyNFT = new PropertyNFT();
        console.log("PropertyNFT deployed at:", address(propertyNFT));
        
        // Step 3: Deploy YieldDistributor
        console.log("\n3. Deploying YieldDistributor...");
        YieldDistributor yieldDistributor = new YieldDistributor(address(propertyNFT), address(gameToken));
        console.log("YieldDistributor deployed at:", address(yieldDistributor));
        
        // Step 4: Deploy TokenSwap
        console.log("\n4. Deploying TokenSwap...");
        TokenSwap tokenSwap = new TokenSwap(address(gameToken));
        console.log("TokenSwap deployed at:", address(tokenSwap));
        
        // Step 5: Deploy QuestSystem (if not already deployed, use existing address)
        address questSystemAddress = vm.envOr("QUEST_SYSTEM_ADDRESS", address(0));
        QuestSystem questSystem;
        if (questSystemAddress == address(0)) {
            console.log("\n5. Deploying QuestSystem...");
            questSystem = new QuestSystem(address(propertyNFT), address(gameToken));
            console.log("QuestSystem deployed at:", address(questSystem));
        } else {
            console.log("\n5. Using existing QuestSystem at:", questSystemAddress);
            questSystem = QuestSystem(questSystemAddress);
        }
        
        // Step 6: Set YieldDistributor as minter in GameToken
        console.log("\n6. Setting YieldDistributor as minter in GameToken...");
        gameToken.setMinter(address(yieldDistributor), true);
        bool isYieldDistributorMinter = gameToken.minters(address(yieldDistributor));
        console.log("YieldDistributor is minter:", isYieldDistributorMinter);
        require(isYieldDistributorMinter, "Failed to set YieldDistributor as minter");
        
        // Step 7: Set QuestSystem as minter in GameToken
        console.log("\n7. Setting QuestSystem as minter in GameToken...");
        gameToken.setMinter(address(questSystem), true);
        bool isQuestSystemMinter = gameToken.minters(address(questSystem));
        console.log("QuestSystem is minter:", isQuestSystemMinter);
        require(isQuestSystemMinter, "Failed to set QuestSystem as minter");
        
        // Step 8: Set GameToken in PropertyNFT
        console.log("\n8. Setting GameToken in PropertyNFT...");
        propertyNFT.setGameToken(address(gameToken));
        address propertyNFTGameToken = address(propertyNFT.gameToken());
        console.log("PropertyNFT gameToken set to:", propertyNFTGameToken);
        require(propertyNFTGameToken == address(gameToken), "Failed to set gameToken");
        
        // Step 9: Fund TokenSwap with TYCOON tokens (optional - can do manually)
        console.log("\n9. Funding TokenSwap with TYCOON tokens...");
        uint256 swapFundAmount = 1_000_000 * 10**18; // 1 million TYCOON for users to purchase
        gameToken.transfer(address(tokenSwap), swapFundAmount);
        uint256 swapBalance = gameToken.balanceOf(address(tokenSwap));
        console.log("TokenSwap balance:", swapBalance / 10**18, "TYCOON");
        
        console.log("\n==========================================");
        console.log("Deployment Complete!");
        console.log("==========================================");
        console.log("\nContract Addresses:");
        console.log("GameToken:", address(gameToken));
        console.log("PropertyNFT:", address(propertyNFT));
        console.log("YieldDistributor:", address(yieldDistributor));
        console.log("TokenSwap:", address(tokenSwap));
        console.log("QuestSystem:", address(questSystem));
        
        console.log("\nNext Steps:");
        console.log("1. Update frontend/.env.local with new addresses");
        console.log("2. Update backend/.env with new addresses");
        console.log("3. Update frontend/src/lib/contracts.ts with new addresses");
        console.log("4. Update README.md with new addresses");
        
        vm.stopBroadcast();
    }
}

