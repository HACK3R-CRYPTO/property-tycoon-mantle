// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {GameToken} from "../src/GameToken.sol";

/**
 * @notice Fund TokenSwap contract with TYCOON tokens for users to purchase
 * @dev Transfer tokens from deployer to TokenSwap contract
 */
contract FundTokenSwap is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address gameTokenAddress = vm.envAddress("GAME_TOKEN_ADDRESS");
        address tokenSwapAddress = vm.envAddress("TOKEN_SWAP_ADDRESS");
        uint256 amount = vm.envUint("AMOUNT"); // Amount in TYCOON tokens (with 18 decimals)
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Funding TokenSwap contract with TYCOON tokens...");
        console.log("GameToken address:", gameTokenAddress);
        console.log("TokenSwap address:", tokenSwapAddress);
        console.log("Amount:", amount / 1e18, "TYCOON");
        
        GameToken gameToken = GameToken(gameTokenAddress);
        
        // Check deployer balance
        uint256 deployerBalance = gameToken.balanceOf(vm.addr(deployerPrivateKey));
        console.log("Deployer balance:", deployerBalance / 1e18, "TYCOON");
        require(deployerBalance >= amount, "Insufficient balance");
        
        // Transfer tokens to TokenSwap
        require(gameToken.transfer(tokenSwapAddress, amount), "Transfer failed");
        
        uint256 swapBalance = gameToken.balanceOf(tokenSwapAddress);
        console.log("TokenSwap balance:", swapBalance / 1e18, "TYCOON");
        console.log("Successfully funded TokenSwap!");
        
        vm.stopBroadcast();
    }
}




