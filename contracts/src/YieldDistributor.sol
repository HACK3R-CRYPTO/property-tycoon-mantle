// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./PropertyNFT.sol";

contract YieldDistributor {
    PropertyNFT public propertyNFT;
    IERC20 public gameToken;
    
    mapping(uint256 => uint256) public pendingYield;
    
    event YieldDistributed(uint256 indexed propertyId, uint256 amount);
    event YieldClaimed(uint256 indexed propertyId, address indexed owner, uint256 amount);
    
    constructor(address _propertyNFT, address _gameToken) {
        propertyNFT = PropertyNFT(_propertyNFT);
        gameToken = IERC20(_gameToken);
    }
    
    function distributeYield(uint256 propertyId, uint256 amount) public {
        pendingYield[propertyId] += amount;
        emit YieldDistributed(propertyId, amount);
    }
    
    function claimYield(uint256 propertyId) public {
        require(propertyNFT.ownerOf(propertyId) == msg.sender, "Not owner");
        uint256 amount = pendingYield[propertyId];
        require(amount > 0, "No yield to claim");
        
        pendingYield[propertyId] = 0;
        gameToken.transfer(msg.sender, amount);
        emit YieldClaimed(propertyId, msg.sender, amount);
    }
}

