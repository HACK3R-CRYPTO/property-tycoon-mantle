// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {PropertyNFT} from "../src/PropertyNFT.sol";

contract PropertyNFTTest is Test {
    PropertyNFT public propertyNFT;
    address public owner = address(1);
    address public user = address(2);
    
    function setUp() public {
        propertyNFT = new PropertyNFT();
    }
    
    function testMintProperty() public {
        vm.prank(owner);
        uint256 tokenId = propertyNFT.mintProperty(
            user,
            PropertyNFT.PropertyType.Residential,
            1000,
            500
        );
        
        assertEq(propertyNFT.ownerOf(tokenId), user);
        PropertyNFT.Property memory prop = propertyNFT.getProperty(tokenId);
        assertEq(uint256(prop.propertyType), uint256(PropertyNFT.PropertyType.Residential));
        assertEq(prop.value, 1000);
    }
    
    function testLinkToRWA() public {
        vm.prank(owner);
        uint256 tokenId = propertyNFT.mintProperty(
            user,
            PropertyNFT.PropertyType.Commercial,
            2000,
            800
        );
        
        vm.prank(user);
        propertyNFT.linkToRWA(tokenId, address(0x123), 1);
        
        PropertyNFT.Property memory prop = propertyNFT.getProperty(tokenId);
        assertEq(prop.rwaContract, address(0x123));
        assertEq(prop.rwaTokenId, 1);
    }
}

