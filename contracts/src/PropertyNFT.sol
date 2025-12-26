// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PropertyNFT is ERC721, Ownable {
    uint256 private _tokenIdCounter;
    
    enum PropertyType { Residential, Commercial, Industrial, Luxury }
    
    struct Property {
        PropertyType propertyType;
        uint256 value;
        uint256 yieldRate;
        address rwaContract;
        uint256 rwaTokenId;
        uint256 totalYieldEarned;
    }
    
    mapping(uint256 => Property) public properties;
    
    event PropertyCreated(uint256 indexed tokenId, address indexed owner, PropertyType propertyType);
    event PropertyLinkedToRWA(uint256 indexed tokenId, address rwaContract, uint256 rwaTokenId);
    
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
            totalYieldEarned: 0
        });
        
        emit PropertyCreated(tokenId, to, propertyType);
        return tokenId;
    }
    
    function linkToRWA(
        uint256 tokenId,
        address rwaContract,
        uint256 rwaTokenId
    ) public {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        properties[tokenId].rwaContract = rwaContract;
        properties[tokenId].rwaTokenId = rwaTokenId;
        emit PropertyLinkedToRWA(tokenId, rwaContract, rwaTokenId);
    }
    
    function getProperty(uint256 tokenId) public view returns (Property memory) {
        return properties[tokenId];
    }
}

