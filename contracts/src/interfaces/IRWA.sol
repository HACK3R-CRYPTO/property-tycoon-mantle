// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IRWA
 * @notice Standard interface for Real-World Asset contracts
 * @dev Any RWA contract implementing this interface can be linked to Property NFTs
 * 
 * This interface allows Property Tycoon to work with any RWA platform that implements
 * these standard functions. Examples:
 * - Centrifuge (real estate, invoices)
 * - RealT (tokenized properties)
 * - Tangible (real-world asset NFTs)
 * - Custom RWA platforms
 */
interface IRWA {
    /**
     * @notice Get the value of an RWA token
     * @param tokenId The RWA token ID
     * @return The property value in wei
     */
    function getPropertyValue(uint256 tokenId) external view returns (uint256);
    
    /**
     * @notice Get the annual yield for an RWA token
     * @param tokenId The RWA token ID
     * @return The annual yield amount in wei
     */
    function getAnnualYield(uint256 tokenId) external view returns (uint256);
    
    /**
     * @notice Get the yield rate (APY) for an RWA token
     * @param tokenId The RWA token ID
     * @return APY in basis points (e.g., 500 = 5%)
     */
    function getYieldRate(uint256 tokenId) external view returns (uint256);
    
    /**
     * @notice Check if an RWA token exists and is active
     * @param tokenId The RWA token ID
     * @return True if token exists and is active
     */
    function isActive(uint256 tokenId) external view returns (bool);
    
    /**
     * @notice Get the owner of an RWA token (for ERC-721 compatibility)
     * @param tokenId The RWA token ID
     * @return The owner address
     */
    function ownerOf(uint256 tokenId) external view returns (address);
}

