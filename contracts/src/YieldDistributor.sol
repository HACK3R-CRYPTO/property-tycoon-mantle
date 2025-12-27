// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./PropertyNFT.sol";

contract YieldDistributor is ReentrancyGuard, Ownable {
    PropertyNFT public propertyNFT;
    IERC20 public gameToken;
    
    mapping(uint256 => uint256) public pendingYield;
    mapping(address => uint256) public totalYieldClaimed;
    mapping(uint256 => uint256) public lastYieldUpdate;
    
    uint256 public constant YIELD_UPDATE_INTERVAL = 1 days;
    
    event YieldDistributed(uint256 indexed propertyId, uint256 amount);
    event YieldClaimed(uint256 indexed propertyId, address indexed owner, uint256 amount);
    event BatchYieldDistributed(uint256[] propertyIds, uint256[] amounts);
    event BatchYieldClaimed(address indexed owner, uint256[] propertyIds, uint256 totalAmount);
    
    constructor(address _propertyNFT, address _gameToken) Ownable(msg.sender) {
        propertyNFT = PropertyNFT(_propertyNFT);
        gameToken = IERC20(_gameToken);
    }
    
    function distributeYield(uint256 propertyId, uint256 amount) public {
        require(amount > 0, "Invalid amount");
        pendingYield[propertyId] += amount;
        lastYieldUpdate[propertyId] = block.timestamp;
        emit YieldDistributed(propertyId, amount);
    }
    
    function batchDistributeYield(
        uint256[] calldata propertyIds,
        uint256[] calldata amounts
    ) public {
        require(propertyIds.length == amounts.length, "Array length mismatch");
        require(propertyIds.length > 0 && propertyIds.length <= 100, "Invalid batch size");
        
        for (uint256 i = 0; i < propertyIds.length; i++) {
            if (amounts[i] > 0) {
                pendingYield[propertyIds[i]] += amounts[i];
                lastYieldUpdate[propertyIds[i]] = block.timestamp;
            }
        }
        
        emit BatchYieldDistributed(propertyIds, amounts);
    }
    
    function claimYield(uint256 propertyId) public nonReentrant {
        require(propertyNFT.ownerOf(propertyId) == msg.sender, "Not owner");
        uint256 amount = pendingYield[propertyId];
        require(amount > 0, "No yield to claim");
        
        pendingYield[propertyId] = 0;
        totalYieldClaimed[msg.sender] += amount;
        
        gameToken.transfer(msg.sender, amount);
        emit YieldClaimed(propertyId, msg.sender, amount);
    }
    
    function batchClaimYield(uint256[] calldata propertyIds) public nonReentrant {
        require(propertyIds.length > 0 && propertyIds.length <= 50, "Invalid batch size");
        
        uint256 totalAmount = 0;
        
        for (uint256 i = 0; i < propertyIds.length; i++) {
            require(propertyNFT.ownerOf(propertyIds[i]) == msg.sender, "Not owner");
            uint256 amount = pendingYield[propertyIds[i]];
            if (amount > 0) {
                pendingYield[propertyIds[i]] = 0;
                totalAmount += amount;
            }
        }
        
        require(totalAmount > 0, "No yield to claim");
        
        totalYieldClaimed[msg.sender] += totalAmount;
        gameToken.transfer(msg.sender, totalAmount);
        
        emit BatchYieldClaimed(msg.sender, propertyIds, totalAmount);
    }
    
    function calculateYield(uint256 propertyId) public view returns (uint256) {
        PropertyNFT.Property memory prop = propertyNFT.getProperty(propertyId);
        if (prop.value == 0 || prop.yieldRate == 0) return 0;
        
        // If lastYieldUpdate is 0, use property creation time (first time)
        uint256 lastUpdate = lastYieldUpdate[propertyId];
        if (lastUpdate == 0) {
            lastUpdate = prop.createdAt;
        }
        
        uint256 timeSinceUpdate = block.timestamp - lastUpdate;
        
        // Cap yield calculation to prevent overflow (max 365 days)
        if (timeSinceUpdate > 365 days) {
            timeSinceUpdate = 365 days;
        }
        
        if (timeSinceUpdate < YIELD_UPDATE_INTERVAL) {
            return pendingYield[propertyId];
        }
        
        // Calculate daily yield: (value * yieldRate) / (365 * 10000)
        // yieldRate is in basis points (500 = 5%)
        uint256 dailyYield = (prop.value * prop.yieldRate) / (365 * 10000);
        uint256 periods = timeSinceUpdate / YIELD_UPDATE_INTERVAL;
        
        // Cap periods to prevent overflow
        if (periods > 365) {
            periods = 365;
        }
        
        return pendingYield[propertyId] + (dailyYield * periods);
    }
    
    function getTotalPendingYield(address owner) public view returns (uint256) {
        uint256[] memory properties = propertyNFT.getOwnerProperties(owner);
        uint256 total = 0;
        
        for (uint256 i = 0; i < properties.length; i++) {
            total += calculateYield(properties[i]);
        }
        
        return total;
    }
}
