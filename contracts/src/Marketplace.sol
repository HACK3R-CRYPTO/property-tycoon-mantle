// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./PropertyNFT.sol";
import "./GameToken.sol";

contract Marketplace is ReentrancyGuard, Ownable {
    PropertyNFT public propertyNFT;
    GameToken public gameToken;
    
    struct Listing {
        uint256 propertyId;
        address seller;
        uint256 price;
        bool isActive;
        uint256 createdAt;
    }
    
    struct Auction {
        uint256 propertyId;
        address seller;
        uint256 startingPrice;
        uint256 highestBid;
        address highestBidder;
        uint256 endTime;
        bool isActive;
    }
    
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Auction) public auctions;
    uint256 public listingFee = 25; // 2.5% in basis points
    uint256 public auctionFee = 25; // 2.5% in basis points
    
    event PropertyListed(uint256 indexed propertyId, address indexed seller, uint256 price);
    event PropertySold(uint256 indexed propertyId, address indexed seller, address indexed buyer, uint256 price);
    event ListingCancelled(uint256 indexed propertyId);
    event AuctionCreated(uint256 indexed propertyId, address indexed seller, uint256 startingPrice, uint256 endTime);
    event BidPlaced(uint256 indexed propertyId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed propertyId, address indexed winner, uint256 finalPrice);
    
    constructor(address _propertyNFT, address _gameToken) Ownable(msg.sender) {
        propertyNFT = PropertyNFT(_propertyNFT);
        gameToken = GameToken(_gameToken);
    }
    
    function listProperty(uint256 propertyId, uint256 price) public {
        require(propertyNFT.ownerOf(propertyId) == msg.sender, "Not owner");
        require(price > 0, "Invalid price");
        require(!listings[propertyId].isActive, "Already listed");
        
        propertyNFT.transferFrom(msg.sender, address(this), propertyId);
        
        listings[propertyId] = Listing({
            propertyId: propertyId,
            seller: msg.sender,
            price: price,
            isActive: true,
            createdAt: block.timestamp
        });
        
        emit PropertyListed(propertyId, msg.sender, price);
    }
    
    function buyProperty(uint256 propertyId) public nonReentrant {
        Listing storage listing = listings[propertyId];
        require(listing.isActive, "Not listed");
        
        uint256 fee = (listing.price * listingFee) / 1000;
        uint256 sellerAmount = listing.price - fee;
        
        gameToken.transferFrom(msg.sender, listing.seller, sellerAmount);
        gameToken.transferFrom(msg.sender, owner(), fee);
        
        propertyNFT.transferFrom(address(this), msg.sender, propertyId);
        
        listing.isActive = false;
        
        emit PropertySold(propertyId, listing.seller, msg.sender, listing.price);
    }
    
    function cancelListing(uint256 propertyId) public {
        Listing storage listing = listings[propertyId];
        require(listing.seller == msg.sender, "Not seller");
        require(listing.isActive, "Not active");
        
        propertyNFT.transferFrom(address(this), msg.sender, propertyId);
        listing.isActive = false;
        
        emit ListingCancelled(propertyId);
    }
    
    function createAuction(
        uint256 propertyId,
        uint256 startingPrice,
        uint256 duration
    ) public {
        require(propertyNFT.ownerOf(propertyId) == msg.sender, "Not owner");
        require(startingPrice > 0, "Invalid price");
        require(duration > 0, "Invalid duration");
        require(!auctions[propertyId].isActive, "Auction exists");
        
        propertyNFT.transferFrom(msg.sender, address(this), propertyId);
        
        auctions[propertyId] = Auction({
            propertyId: propertyId,
            seller: msg.sender,
            startingPrice: startingPrice,
            highestBid: startingPrice,
            highestBidder: address(0),
            endTime: block.timestamp + duration,
            isActive: true
        });
        
        emit AuctionCreated(propertyId, msg.sender, startingPrice, block.timestamp + duration);
    }
    
    function placeBid(uint256 propertyId, uint256 bidAmount) public nonReentrant {
        Auction storage auction = auctions[propertyId];
        require(auction.isActive, "Auction not active");
        require(block.timestamp < auction.endTime, "Auction ended");
        require(bidAmount > auction.highestBid, "Bid too low");
        
        if (auction.highestBidder != address(0)) {
            gameToken.transfer(auction.highestBidder, auction.highestBid);
        }
        
        gameToken.transferFrom(msg.sender, address(this), bidAmount);
        
        auction.highestBid = bidAmount;
        auction.highestBidder = msg.sender;
        
        emit BidPlaced(propertyId, msg.sender, bidAmount);
    }
    
    function endAuction(uint256 propertyId) public nonReentrant {
        Auction storage auction = auctions[propertyId];
        require(auction.isActive, "Auction not active");
        require(block.timestamp >= auction.endTime, "Auction ongoing");
        
        if (auction.highestBidder != address(0)) {
            uint256 fee = (auction.highestBid * auctionFee) / 1000;
            uint256 sellerAmount = auction.highestBid - fee;
            
            gameToken.transfer(auction.seller, sellerAmount);
            gameToken.transfer(owner(), fee);
            propertyNFT.transferFrom(address(this), auction.highestBidder, propertyId);
            
            emit AuctionEnded(propertyId, auction.highestBidder, auction.highestBid);
        } else {
            propertyNFT.transferFrom(address(this), auction.seller, propertyId);
        }
        
        auction.isActive = false;
    }
    
    function batchListProperties(
        uint256[] calldata propertyIds,
        uint256[] calldata prices
    ) public {
        require(propertyIds.length == prices.length, "Array length mismatch");
        require(propertyIds.length > 0 && propertyIds.length <= 20, "Invalid batch size");
        
        for (uint256 i = 0; i < propertyIds.length; i++) {
            listProperty(propertyIds[i], prices[i]);
        }
    }
}

