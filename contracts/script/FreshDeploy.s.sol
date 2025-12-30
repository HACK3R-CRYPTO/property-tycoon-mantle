// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {GameToken} from "../src/GameToken.sol";
import {PropertyNFT} from "../src/PropertyNFT.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";
import {TokenSwap} from "../src/TokenSwap.sol";
import {QuestSystem} from "../src/QuestSystem.sol";
import {Marketplace} from "../src/Marketplace.sol";

/**
 * @title FreshDeploy
 * @notice Fresh deployment of all contracts with proper initialization
 * @dev Deploys in correct order and sets up all relationships
 */
contract FreshDeploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("==========================================");
        console.log("FRESH DEPLOYMENT - All Contracts");
        console.log("==========================================");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        
        // Step 1: Deploy GameToken
        console.log("\n1. Deploying GameToken...");
        GameToken gameToken = new GameToken();
        console.log("   GameToken:", address(gameToken));
        
        // Step 2: Deploy PropertyNFT (with costs initialized in constructor)
        console.log("\n2. Deploying PropertyNFT...");
        PropertyNFT propertyNFT = new PropertyNFT();
        console.log("   PropertyNFT:", address(propertyNFT));
        
        // Step 3: Deploy YieldDistributor
        console.log("\n3. Deploying YieldDistributor...");
        YieldDistributor yieldDistributor = new YieldDistributor(
            address(propertyNFT),
            address(gameToken)
        );
        console.log("   YieldDistributor:", address(yieldDistributor));
        
        // Step 4: Deploy TokenSwap
        console.log("\n4. Deploying TokenSwap...");
        TokenSwap tokenSwap = new TokenSwap(address(gameToken));
        console.log("   TokenSwap:", address(tokenSwap));
        
        // Step 5: Deploy QuestSystem
        console.log("\n5. Deploying QuestSystem...");
        QuestSystem questSystem = new QuestSystem(
            address(propertyNFT),
            address(gameToken)
        );
        console.log("   QuestSystem:", address(questSystem));
        
        // Step 6: Deploy Marketplace
        console.log("\n6. Deploying Marketplace...");
        Marketplace marketplace = new Marketplace(
            address(propertyNFT),
            address(gameToken)
        );
        console.log("   Marketplace:", address(marketplace));
        
        // Step 7: Set YieldDistributor as minter in GameToken
        console.log("\n7. Setting YieldDistributor as minter...");
        gameToken.setMinter(address(yieldDistributor), true);
        require(gameToken.minters(address(yieldDistributor)), "Failed to set YieldDistributor as minter");
        console.log("    YieldDistributor is minter");
        
        // Step 8: Set QuestSystem as minter in GameToken
        console.log("\n8. Setting QuestSystem as minter...");
        gameToken.setMinter(address(questSystem), true);
        require(gameToken.minters(address(questSystem)), "Failed to set QuestSystem as minter");
        console.log("    QuestSystem is minter");
        
        // Step 9: Set GameToken in PropertyNFT
        console.log("\n9. Setting GameToken in PropertyNFT...");
        propertyNFT.setGameToken(address(gameToken));
        require(address(propertyNFT.gameToken()) == address(gameToken), "Failed to set gameToken");
        console.log("    GameToken set in PropertyNFT");
        
        // Step 10: Verify PropertyNFT costs are initialized
        console.log("\n10. Verifying PropertyNFT costs...");
        uint256 residentialCost = propertyNFT.propertyCosts(PropertyNFT.PropertyType.Residential);
        uint256 commercialCost = propertyNFT.propertyCosts(PropertyNFT.PropertyType.Commercial);
        uint256 industrialCost = propertyNFT.propertyCosts(PropertyNFT.PropertyType.Industrial);
        console.log("   Residential cost:", residentialCost / 10**18, "TYCOON");
        console.log("   Commercial cost:", commercialCost / 10**18, "TYCOON");
        console.log("   Industrial cost:", industrialCost / 10**18, "TYCOON");
        require(residentialCost > 0 && commercialCost > 0 && industrialCost > 0, "Property costs not initialized");
        console.log("    All property costs initialized");
        
        // Step 11: Verify QuestSystem is using correct PropertyNFT
        console.log("\n11. Verifying QuestSystem configuration...");
        address questPropertyNFT = address(questSystem.propertyNFT());
        address questGameToken = address(questSystem.gameToken());
        require(questPropertyNFT == address(propertyNFT), "QuestSystem using wrong PropertyNFT");
        require(questGameToken == address(gameToken), "QuestSystem using wrong GameToken");
        console.log("   QuestSystem using correct PropertyNFT:", questPropertyNFT);
        console.log("   QuestSystem using correct GameToken:", questGameToken);
        
        // Step 12: Fund TokenSwap (optional - can skip if low on funds)
        console.log("\n12. Funding TokenSwap with TYCOON tokens...");
        uint256 swapFundAmount = 1_000_000 * 10**18; // 1 million TYCOON
        gameToken.transfer(address(tokenSwap), swapFundAmount);
        uint256 swapBalance = gameToken.balanceOf(address(tokenSwap));
        console.log("   TokenSwap balance:", swapBalance / 10**18, "TYCOON");
        
        console.log("\n==========================================");
        console.log("DEPLOYMENT COMPLETE!");
        console.log("==========================================");
        console.log("\nContract Addresses:");
        console.log("GameToken:", address(gameToken));
        console.log("PropertyNFT:", address(propertyNFT));
        console.log("YieldDistributor:", address(yieldDistributor));
        console.log("TokenSwap:", address(tokenSwap));
        console.log("QuestSystem:", address(questSystem));
        console.log("Marketplace:", address(marketplace));
        
        console.log("\nNext Steps:");
        console.log("1. Update frontend/.env.local");
        console.log("2. Update backend/.env");
        console.log("3. Update frontend/src/lib/contracts.ts");
        
        vm.stopBroadcast();
    }
}

