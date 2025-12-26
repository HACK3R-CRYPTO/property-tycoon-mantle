// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PropertyNFT is ERC721, Ownable, ReentrancyGuard {
    uint256 private _tokenIdCounter;
    
    enum PropertyType { Residential, Commercial, Industrial, Luxury }
    
    struct Property {
        PropertyType propertyType;
        uint256 value;
        uint256 yieldRate;
        address rwaContract;
        uint256 rwaTokenId;
        uint256 totalYieldEarned;
        uint256 createdAt;
        bool isActive;
    }
    
    mapping(uint256 => Property) public properties;
    mapping(address => uint256[]) public ownerProperties;
    mapping(PropertyType => uint256) public propertyTypeCounts;
    
    event PropertyCreated(uint256 indexed tokenId, address indexed owner, PropertyType propertyType, uint256 value);
    event PropertyLinkedToRWA(uint256 indexed tokenId, address rwaContract, uint256 rwaTokenId);
    event PropertyUpgraded(uint256 indexed tokenId, PropertyType newType, uint256 newValue);
    event PropertiesBatchMinted(address indexed owner, uint256[] tokenIds);
    
    constructor() ERC721("PropertyNFT", "PROP") Ownable(msg.sender) {}
    
    function mintProperty(
        address to,
        PropertyType propertyType,
        uint256 value,
        uint256 yieldRate
    ) public onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        
        properties[tokenId] = Property({
            propertyType: propertyType,
            value: value,
            yieldRate: yieldRate,
            rwaContract: address(0),
            rwaTokenId: 0,
            totalYieldEarned: 0,
            createdAt: block.timestamp,
            isActive: true
        });
        
        ownerProperties[to].push(tokenId);
        propertyTypeCounts[propertyType]++;
        
        emit PropertyCreated(tokenId, to, propertyType, value);
        return tokenId;
    }
    
    function batchMintProperties(
        address to,
        PropertyType[] calldata propertyTypes,
        uint256[] calldata values,
        uint256[] calldata yieldRates
    ) public onlyOwner returns (uint256[] memory) {
        require(propertyTypes.length == values.length && values.length == yieldRates.length, "Array length mismatch");
        require(propertyTypes.length > 0 && propertyTypes.length <= 50, "Invalid batch size");
        
        uint256[] memory tokenIds = new uint256[](propertyTypes.length);
        
        for (uint256 i = 0; i < propertyTypes.length; i++) {
            uint256 tokenId = _tokenIdCounter++;
            _safeMint(to, tokenId);
            
            properties[tokenId] = Property({
                propertyType: propertyTypes[i],
                value: values[i],
                yieldRate: yieldRates[i],
                rwaContract: address(0),
                rwaTokenId: 0,
                totalYieldEarned: 0,
                createdAt: block.timestamp,
                isActive: true
            });
            
            ownerProperties[to].push(tokenId);
            propertyTypeCounts[propertyTypes[i]]++;
            tokenIds[i] = tokenId;
        }
        
        emit PropertiesBatchMinted(to, tokenIds);
        return tokenIds;
    }
    
    function linkToRWA(
        uint256 tokenId,
        address rwaContract,
        uint256 rwaTokenId
    ) public {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(properties[tokenId].isActive, "Property not active");
        properties[tokenId].rwaContract = rwaContract;
        properties[tokenId].rwaTokenId = rwaTokenId;
        emit PropertyLinkedToRWA(tokenId, rwaContract, rwaTokenId);
    }
    
    function upgradeProperty(
        uint256 tokenId,
        PropertyType newType,
        uint256 newValue,
        uint256 newYieldRate
    ) public {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(properties[tokenId].isActive, "Property not active");
        
        PropertyType oldType = properties[tokenId].propertyType;
        propertyTypeCounts[oldType]--;
        propertyTypeCounts[newType]++;
        
        properties[tokenId].propertyType = newType;
        properties[tokenId].value = newValue;
        properties[tokenId].yieldRate = newYieldRate;
        
        emit PropertyUpgraded(tokenId, newType, newValue);
    }
    
    function getProperty(uint256 tokenId) public view returns (Property memory) {
        return properties[tokenId];
    }
    
    function getOwnerProperties(address owner) public view returns (uint256[] memory) {
        return ownerProperties[owner];
    }
    
    function getOwnerPropertyCount(address owner) public view returns (uint256) {
        return ownerProperties[owner].length;
    }
    
    function getPropertyTypeCount(PropertyType propertyType) public view returns (uint256) {
        return propertyTypeCounts[propertyType];
    }
    
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address previousOwner = super._update(to, tokenId, auth);
        
        if (previousOwner != address(0)) {
            uint256[] storage ownerProps = ownerProperties[previousOwner];
            for (uint256 i = 0; i < ownerProps.length; i++) {
                if (ownerProps[i] == tokenId) {
                    ownerProps[i] = ownerProps[ownerProps.length - 1];
                    ownerProps.pop();
                    break;
                }
            }
        }
        
        if (to != address(0)) {
            ownerProperties[to].push(tokenId);
        }
        
        return previousOwner;
    }
}
