// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./PropertyNFT.sol";
import "./GameToken.sol";

// Interface for RWA contracts (MockRWA or real RWA)
interface IRWA {
    function getRWAProperty(uint256 tokenId) external view returns (
        string memory name,
        uint256 value,
        uint256 monthlyYield,
        string memory location,
        uint256 createdAt,
        bool isActive
    );
    function getYieldRate(uint256 tokenId) external view returns (uint256);
    function properties(uint256 tokenId) external view returns (
        string memory name,
        uint256 value,
        uint256 monthlyYield,
        string memory location,
        uint256 createdAt,
        bool isActive
    );
}

contract YieldDistributor is ReentrancyGuard, Ownable {
    PropertyNFT public propertyNFT;
    GameToken public gameToken;
    
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
        gameToken = GameToken(_gameToken);
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
        uint256 amount = calculateYield(propertyId); // Use calculateYield to get actual claimable amount (includes time check)
        require(amount > 0, "No yield to claim");
        
        // Clear pendingYield and update lastYieldUpdate
        pendingYield[propertyId] = 0;
        lastYieldUpdate[propertyId] = block.timestamp;
        totalYieldClaimed[msg.sender] += amount;
        
        // Mint tokens directly to the user (yield is generated, not transferred)
        gameToken.mint(msg.sender, amount);
        emit YieldClaimed(propertyId, msg.sender, amount);
    }
    
    function batchClaimYield(uint256[] calldata propertyIds) public nonReentrant {
        require(propertyIds.length > 0 && propertyIds.length <= 50, "Invalid batch size");
        
        uint256 totalAmount = 0;
        
        for (uint256 i = 0; i < propertyIds.length; i++) {
            require(propertyNFT.ownerOf(propertyIds[i]) == msg.sender, "Not owner");
            uint256 amount = calculateYield(propertyIds[i]); // Use calculateYield to get actual claimable amount (includes time check)
            if (amount > 0) {
                pendingYield[propertyIds[i]] = 0;
                lastYieldUpdate[propertyIds[i]] = block.timestamp;
                totalAmount += amount;
            }
        }
        
        require(totalAmount > 0, "No yield to claim");
        
        totalYieldClaimed[msg.sender] += totalAmount;
        
        // Mint tokens directly to the user (yield is generated, not transferred)
        gameToken.mint(msg.sender, totalAmount);
        
        emit BatchYieldClaimed(msg.sender, propertyIds, totalAmount);
    }
    
    function calculateYield(uint256 propertyId) public view returns (uint256) {
        PropertyNFT.Property memory prop = propertyNFT.getProperty(propertyId);
        
        // Determine which value and yieldRate to use
        uint256 value;
        uint256 yieldRate;
        
        // Check if property is linked to RWA
        if (prop.rwaContract != address(0) && prop.rwaTokenId > 0) {
            // Try to fetch RWA data
            try IRWA(prop.rwaContract).getRWAProperty(prop.rwaTokenId) returns (
                string memory,
                uint256 rwaValue,
                uint256,
                string memory,
                uint256,
                bool isActive
            ) {
                // Only use RWA data if RWA is active and has valid value
                if (isActive && rwaValue > 0) {
                    value = rwaValue;
                    // Get yield rate from RWA contract
                    try IRWA(prop.rwaContract).getYieldRate(prop.rwaTokenId) returns (uint256 rwaYieldRate) {
                        if (rwaYieldRate > 0) {
                            yieldRate = rwaYieldRate;
                        } else {
                            // Fallback to property yieldRate if RWA yieldRate is 0
                            value = prop.value;
                            yieldRate = prop.yieldRate;
                        }
                    } catch {
                        // If getYieldRate fails, fallback to property data
                        value = prop.value;
                        yieldRate = prop.yieldRate;
                    }
                } else {
                    // RWA not active or invalid, use property data
                    value = prop.value;
                    yieldRate = prop.yieldRate;
                }
            } catch {
                // If RWA contract call fails, fallback to property data (backward compatible)
                value = prop.value;
                yieldRate = prop.yieldRate;
            }
        } else {
            // Not linked to RWA, use property's own data (existing behavior)
            value = prop.value;
            yieldRate = prop.yieldRate;
        }
        
        // Validate value and yieldRate
        if (value == 0 || yieldRate == 0) return 0;
        
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
        uint256 dailyYield = (value * yieldRate) / (365 * 10000);
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
