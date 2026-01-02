// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";
import {GameToken} from "../src/GameToken.sol";
import {PropertyNFT} from "../src/PropertyNFT.sol";

/**
 * @notice Deploy fixed YieldDistributor with RWA interface fix
 * @dev This fixes the getRWAProperty -> properties mapping issue
 */
contract DeployFixedYieldDistributor is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address propertyNFTAddress = vm.envAddress("PROPERTY_NFT_ADDRESS");
        address gameTokenAddress = vm.envAddress("GAME_TOKEN_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("==========================================");
        console.log("Deploying Fixed YieldDistributor");
        console.log("==========================================");
        console.log("PropertyNFT address:", propertyNFTAddress);
        console.log("GameToken address:", gameTokenAddress);
        console.log("");
        
        // Deploy new YieldDistributor with fix
        console.log("Deploying YieldDistributor...");
        YieldDistributor yieldDistributor = new YieldDistributor(propertyNFTAddress, gameTokenAddress);
        console.log("YieldDistributor deployed at:", address(yieldDistributor));
        console.log("");
        
        // Set as minter in GameToken
        console.log("Setting YieldDistributor as minter in GameToken...");
        GameToken gameToken = GameToken(gameTokenAddress);
        gameToken.setMinter(address(yieldDistributor), true);
        
        bool isMinter = gameToken.minters(address(yieldDistributor));
        console.log("YieldDistributor is minter:", isMinter);
        require(isMinter, "Failed to set YieldDistributor as minter");
        console.log("");
        
        console.log("==========================================");
        console.log("Deployment Complete!");
        console.log("==========================================");
        console.log("New YieldDistributor address:", address(yieldDistributor));
        console.log("");
        console.log("Next steps:");
        console.log("1. Update frontend/.env.local:");
        console.log("   NEXT_PUBLIC_YIELD_DISTRIBUTOR_ADDRESS=", address(yieldDistributor));
        console.log("2. Update backend/.env:");
        console.log("   YIELD_DISTRIBUTOR_ADDRESS=", address(yieldDistributor));
        console.log("3. Test claimYield - it should work now!");
        
        vm.stopBroadcast();
    }
}

