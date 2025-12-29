// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GameToken is ERC20, Ownable {
    // Mapping of addresses allowed to mint tokens (e.g., YieldDistributor, QuestSystem)
    mapping(address => bool) public minters;
    
    constructor() ERC20("Tycoon Token", "TYCOON") Ownable(msg.sender) {
        _mint(msg.sender, 1_000_000_000 * 10**18);
    }
    
    /**
     * @notice Add or remove a minter address
     * @dev Only owner can set minters
     */
    function setMinter(address _minter, bool _enabled) public onlyOwner {
        minters[_minter] = _enabled;
    }
    
    /**
     * @notice Mint tokens (owner or authorized minter)
     */
    function mint(address to, uint256 amount) public {
        require(msg.sender == owner() || minters[msg.sender], "Not authorized to mint");
        _mint(to, amount);
    }
    
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
}
