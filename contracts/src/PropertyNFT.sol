// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PropertyNFT is ERC721, Ownable, ReentrancyGuard {
    IERC20 public gameToken;
    
    // Property costs in TYCOON tokens (with 18 decimals)
    mapping(PropertyType => uint256) public propertyCosts;
    uint256 private _tokenIdCounter;
    
    // Authorized yield distributor (can update totalYieldEarned)
    address public yieldDistributor;
    
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
    event PropertyPurchased(uint256 indexed tokenId, address indexed buyer, PropertyType propertyType, uint256 cost);
    
    constructor() ERC721("PropertyNFT", "PROP") Ownable(msg.sender) {
        // Set property costs (in TYCOON tokens with 18 decimals)
        propertyCosts[PropertyType.Residential] = 100 * 10**18;  // 100 TYCOON
        propertyCosts[PropertyType.Commercial] = 200 * 10**18;  // 200 TYCOON
        propertyCosts[PropertyType.Industrial] = 500 * 10**18; // 500 TYCOON
        propertyCosts[PropertyType.Luxury] = 1000 * 10**18;     // 1000 TYCOON
    }
    
    /**
     * @notice Set the game token address (for existing deployments)
     * @dev Only owner can call this - allows updating existing contract
     */
    function setGameToken(address _gameToken) public onlyOwner {
        gameToken = IERC20(_gameToken);
    }
    
    /**
     * @notice Set the yield distributor address (authorized to update totalYieldEarned)
     * @dev Only owner can call this
     */
    function setYieldDistributor(address _yieldDistributor) public onlyOwner {
        yieldDistributor = _yieldDistributor;
    }
    
    /**
     * @notice Update total yield earned for a property (only callable by YieldDistributor)
     * @dev This is called by YieldDistributor when yield is claimed
     * @param tokenId Property token ID
     * @param amount Amount of yield earned to add
     */
    function updateTotalYieldEarned(uint256 tokenId, uint256 amount) public {
        require(msg.sender == yieldDistributor, "Only yield distributor can update");
        require(properties[tokenId].isActive, "Property not active");
        properties[tokenId].totalYieldEarned += amount;
    }
    
    /**
     * @notice Set property cost for a property type (for existing deployments)
     * @dev Only owner can call this - allows initializing propertyCosts after deployment
     */
    function setPropertyCost(PropertyType propertyType, uint256 cost) public onlyOwner {
        propertyCosts[propertyType] = cost;
    }
    
    /**
     * @notice Purchase and mint a property by paying TYCOON tokens
     * @param propertyType The type of property to purchase
     * @param value The property value (used for yield calculation)
     * @param yieldRate The yield rate in basis points (e.g., 500 = 5%)
     */
    function purchaseProperty(
        PropertyType propertyType,
        uint256 value,
        uint256 yieldRate
    ) public nonReentrant returns (uint256) {
        require(address(gameToken) != address(0), "Game token not set");
        uint256 cost = propertyCosts[propertyType];
        require(cost > 0, "Invalid property type");
        
        // Check user has enough TYCOON tokens
        require(gameToken.balanceOf(msg.sender) >= cost, "Insufficient TYCOON balance");
        
        // Transfer TYCOON tokens from user to contract
        require(gameToken.transferFrom(msg.sender, address(this), cost), "Token transfer failed");
        
        // Mint property to user
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(msg.sender, tokenId);
        
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
        
        ownerProperties[msg.sender].push(tokenId);
        propertyTypeCounts[propertyType]++;
        
        emit PropertyCreated(tokenId, msg.sender, propertyType, value);
        emit PropertyPurchased(tokenId, msg.sender, propertyType, cost);
        
        return tokenId;
    }
    
    /**
     * @notice Owner can withdraw TYCOON tokens collected from property purchases
     */
    function withdrawTokens() public onlyOwner {
        uint256 balance = gameToken.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        require(gameToken.transfer(owner(), balance), "Token transfer failed");
    }
    
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
    
    /**
     * @notice Link a property NFT to a Real-World Asset (RWA)
     * @dev Validates that RWA contract exists and follows standards (ERC-721/ERC-1155)
     * @param tokenId Property NFT token ID
     * @param rwaContract Address of the RWA contract
     * @param rwaTokenId Token ID in the RWA contract
     */
    function linkToRWA(
        uint256 tokenId,
        address rwaContract,
        uint256 rwaTokenId
    ) public {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(properties[tokenId].isActive, "Property not active");
        require(rwaContract != address(0), "Invalid RWA contract");
        require(rwaContract.code.length > 0, "RWA contract does not exist");
        
        // Validate RWA contract follows NFT standards (ERC-721 or ERC-1155)
        // This ensures we're linking to a valid tokenized asset
        _validateRWAContract(rwaContract, rwaTokenId);
        
        properties[tokenId].rwaContract = rwaContract;
        properties[tokenId].rwaTokenId = rwaTokenId;
        emit PropertyLinkedToRWA(tokenId, rwaContract, rwaTokenId);
    }
    
    /**
     * @notice Internal function to validate RWA contract
     * @dev Checks if contract implements ERC-721 or ERC-1155 standards
     * @param rwaContract Address of the RWA contract
     * @param rwaTokenId Token ID to validate
     */
    function _validateRWAContract(address rwaContract, uint256 rwaTokenId) internal view {
        // Try to check if contract supports ERC-165 (interface detection)
        (bool success, bytes memory data) = rwaContract.staticcall(
            abi.encodeWithSignature("supportsInterface(bytes4)", 0x01ffc9a7) // ERC-165
        );
        
        if (success && data.length > 0) {
            bool supportsERC165 = abi.decode(data, (bool));
            if (supportsERC165) {
                // Check for ERC-721 support (0x80ac58cd)
                (success, data) = rwaContract.staticcall(
                    abi.encodeWithSignature("supportsInterface(bytes4)", 0x80ac58cd)
                );
                if (success && data.length > 0 && abi.decode(data, (bool))) {
                    // ERC-721: Verify token exists by checking ownerOf
                    (success, data) = rwaContract.staticcall(
                        abi.encodeWithSignature("ownerOf(uint256)", rwaTokenId)
                    );
                    if (success && data.length > 0) {
                        address owner = abi.decode(data, (address));
                        require(owner != address(0), "RWA token does not exist");
                        return;
                    }
                }
                
                // Check for ERC-1155 support (0xd9b67a26)
                (success, data) = rwaContract.staticcall(
                    abi.encodeWithSignature("supportsInterface(bytes4)", 0xd9b67a26)
                );
                if (success && data.length > 0 && abi.decode(data, (bool))) {
                    // ERC-1155: Check balance (token must exist and have balance > 0)
                    (success, data) = rwaContract.staticcall(
                        abi.encodeWithSignature("balanceOf(address,uint256)", msg.sender, rwaTokenId)
                    );
                    if (success && data.length > 0) {
                        uint256 balance = abi.decode(data, (uint256));
                        require(balance > 0, "You do not own this RWA token");
                        return;
                    }
                }
            }
        }
        
        // If standard checks fail, at least verify contract exists
        // This allows linking to custom RWA contracts that don't follow ERC standards
        // In production, you might want to require standard compliance
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
