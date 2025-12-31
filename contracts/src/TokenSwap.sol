// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./GameToken.sol";

/**
 * @title TokenSwap
 * @notice Allows users to buy TYCOON tokens with MNT
 * @dev Exchange rate: 1 MNT = 100 TYCOON tokens
 */
contract TokenSwap is Ownable, ReentrancyGuard {
    GameToken public gameToken;
    
    // Exchange rate: 1 MNT = 100 TYCOON tokens (100 * 10^18 wei)
    uint256 public constant EXCHANGE_RATE = 100;
    uint256 public constant MIN_PURCHASE_MNT = 0.001 ether; // Minimum 0.001 MNT
    
    event TokensPurchased(address indexed buyer, uint256 mntAmount, uint256 tycoonAmount);
    event TokensWithdrawn(address indexed to, uint256 amount);
    
    constructor(address _gameToken) Ownable(msg.sender) {
        gameToken = GameToken(_gameToken);
    }
    
    /**
     * @notice Buy TYCOON tokens with MNT
     * @dev Sends MNT to contract, transfers TYCOON tokens to buyer
     */
    function buyTokens() public payable nonReentrant {
        require(msg.value >= MIN_PURCHASE_MNT, "Minimum purchase is 0.001 MNT");
        
        // Calculate TYCOON amount: MNT amount * EXCHANGE_RATE
        // msg.value is in wei, so we multiply by EXCHANGE_RATE
        uint256 tycoonAmount = msg.value * EXCHANGE_RATE;
        
        // Check if contract has enough tokens
        uint256 contractBalance = gameToken.balanceOf(address(this));
        require(contractBalance >= tycoonAmount, "Insufficient tokens in swap contract");
        
        // Transfer TYCOON tokens to buyer
        require(gameToken.transfer(msg.sender, tycoonAmount), "Token transfer failed");
        
        emit TokensPurchased(msg.sender, msg.value, tycoonAmount);
    }
    
    /**
     * @notice Owner can withdraw MNT from contract
     */
    function withdrawMNT() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No MNT to withdraw");
        payable(owner()).transfer(balance);
    }
    
    /**
     * @notice Owner can deposit TYCOON tokens to contract for users to purchase
     */
    function depositTokens(uint256 amount) public {
        require(gameToken.transferFrom(msg.sender, address(this), amount), "Token transfer failed");
    }
    
    /**
     * @notice Owner can withdraw TYCOON tokens from contract (emergency)
     */
    function withdrawTokens(uint256 amount) public onlyOwner {
        require(gameToken.transfer(owner(), amount), "Token transfer failed");
        emit TokensWithdrawn(owner(), amount);
    }
    
    /**
     * @notice Get the amount of TYCOON tokens for a given MNT amount
     */
    function getTycoonAmount(uint256 mntAmount) public pure returns (uint256) {
        return mntAmount * EXCHANGE_RATE;
    }
    
    /**
     * @notice Get the amount of MNT needed for a given TYCOON amount
     */
    function getMntAmount(uint256 tycoonAmount) public pure returns (uint256) {
        return tycoonAmount / EXCHANGE_RATE;
    }
    
    /**
     * @notice Get contract's TYCOON token balance
     */
    function getTokenBalance() public view returns (uint256) {
        return gameToken.balanceOf(address(this));
    }
}





