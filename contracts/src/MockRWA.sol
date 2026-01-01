// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MockRWA
 * @notice Mock Real-World Asset contract for demo/testing
 * @dev Implements ERC-721 standard - can be replaced with real RWA contracts
 * 
 * This contract simulates tokenized real estate assets.
 * In production, this would be replaced with actual RWA platforms like:
 * - Centrifuge (real estate, invoices)
 * - RealT (tokenized properties)
 * - Tangible (real-world asset NFTs)
 */
contract MockRWA is ERC721, Ownable, ReentrancyGuard {
    uint256 private _tokenIdCounter;
    
    struct RWAProperty {
        string name;              // Property name (e.g., "NYC Apartment #42")
        uint256 value;           // Property value in wei
        uint256 monthlyYield;    // Monthly yield in wei
        string location;         // Property location
        uint256 createdAt;       // Creation timestamp
        bool isActive;           // Active status
    }
    
    mapping(uint256 => RWAProperty) public properties;
    mapping(address => uint256[]) public ownerProperties;
    
    event RWAPropertyCreated(
        uint256 indexed tokenId,
        address indexed owner,
        string name,
        uint256 value,
        uint256 monthlyYield
    );
    
    constructor() ERC721("Mock Real-World Asset", "MRWA") Ownable(msg.sender) {}
    
    /**
     * @notice Mint a new RWA property token
     * @param to Address to mint token to
     * @param name Property name
     * @param value Property value (in wei)
     * @param monthlyYield Monthly yield amount (in wei)
     * @param location Property location
     * @return tokenId The minted token ID
     */
    function mintRWAProperty(
        address to,
        string memory name,
        uint256 value,
        uint256 monthlyYield,
        string memory location
    ) public onlyOwner nonReentrant returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        
        properties[tokenId] = RWAProperty({
            name: name,
            value: value,
            monthlyYield: monthlyYield,
            location: location,
            createdAt: block.timestamp,
            isActive: true
        });
        
        ownerProperties[to].push(tokenId);
        
        emit RWAPropertyCreated(tokenId, to, name, value, monthlyYield);
        return tokenId;
    }
    
    /**
     * @notice Batch mint multiple RWA properties
     * @param to Address to mint tokens to
     * @param names Array of property names
     * @param values Array of property values
     * @param monthlyYields Array of monthly yields
     * @param locations Array of property locations
     * @return tokenIds Array of minted token IDs
     */
    function batchMintRWAProperties(
        address to,
        string[] memory names,
        uint256[] memory values,
        uint256[] memory monthlyYields,
        string[] memory locations
    ) public onlyOwner nonReentrant returns (uint256[] memory) {
        require(
            names.length == values.length &&
            values.length == monthlyYields.length &&
            monthlyYields.length == locations.length,
            "Array length mismatch"
        );
        
        uint256[] memory tokenIds = new uint256[](names.length);
        
        for (uint256 i = 0; i < names.length; i++) {
            tokenIds[i] = mintRWAProperty(
                to,
                names[i],
                values[i],
                monthlyYields[i],
                locations[i]
            );
        }
        
        return tokenIds;
    }
    
    /**
     * @notice Get RWA property details
     * @param tokenId Token ID
     * @return RWAProperty struct with property details
     */
    function getRWAProperty(uint256 tokenId) public view returns (RWAProperty memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return properties[tokenId];
    }
    
    /**
     * @notice Get all properties owned by an address
     * @param owner Owner address
     * @return Array of token IDs owned by the address
     */
    function getOwnerProperties(address owner) public view returns (uint256[] memory) {
        return ownerProperties[owner];
    }
    
    /**
     * @notice Calculate annual yield for a property
     * @param tokenId Token ID
     * @return Annual yield amount (monthlyYield * 12)
     */
    function getAnnualYield(uint256 tokenId) public view returns (uint256) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return properties[tokenId].monthlyYield * 12;
    }
    
    /**
     * @notice Calculate yield rate (APY) for a property
     * @param tokenId Token ID
     * @return APY in basis points (e.g., 500 = 5%)
     */
    function getYieldRate(uint256 tokenId) public view returns (uint256) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        RWAProperty memory prop = properties[tokenId];
        if (prop.value == 0) return 0;
        // APY = (annualYield / value) * 10000 (basis points)
        return (prop.monthlyYield * 12 * 10000) / prop.value;
    }
    
    /**
     * @notice Update property value (for demo - simulates market changes)
     * @param tokenId Token ID
     * @param newValue New property value
     */
    function updatePropertyValue(uint256 tokenId, uint256 newValue) public onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        properties[tokenId].value = newValue;
    }
    
    /**
     * @notice Update monthly yield (for demo - simulates rent changes)
     * @param tokenId Token ID
     * @param newMonthlyYield New monthly yield amount
     */
    function updateMonthlyYield(uint256 tokenId, uint256 newMonthlyYield) public onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        properties[tokenId].monthlyYield = newMonthlyYield;
    }
    
    /**
     * @notice Deactivate a property (for demo)
     * @param tokenId Token ID
     */
    function deactivateProperty(uint256 tokenId) public onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        properties[tokenId].isActive = false;
    }
    
    /**
     * @notice Reactivate a property (for demo)
     * @param tokenId Token ID
     */
    function reactivateProperty(uint256 tokenId) public onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        properties[tokenId].isActive = true;
    }
    
    /**
     * @dev Override to update ownerProperties mapping
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address previousOwner = super._update(to, tokenId, auth);
        
        if (previousOwner != address(0)) {
            // Remove from previous owner's list
            uint256[] storage prevOwnerProps = ownerProperties[previousOwner];
            for (uint256 i = 0; i < prevOwnerProps.length; i++) {
                if (prevOwnerProps[i] == tokenId) {
                    prevOwnerProps[i] = prevOwnerProps[prevOwnerProps.length - 1];
                    prevOwnerProps.pop();
                    break;
                }
            }
        }
        
        if (to != address(0)) {
            // Add to new owner's list
            ownerProperties[to].push(tokenId);
        }
        
        return previousOwner;
    }
}




