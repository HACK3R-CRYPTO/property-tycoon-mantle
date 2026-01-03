// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";

// SelfKisser ABI
interface ISelfKisser {
    function selfKiss(address oracle) external;
    function selfKiss(address oracle, address who) external;
}

/**
 * @title WhitelistChronicle
 * @notice Whitelist addresses to read from Chronicle Oracles on Mantle Testnet
 * @dev Uses SelfKisser contract to whitelist addresses
 */
contract WhitelistChronicle is Script {
    // SelfKisser address for Mantle Testnet
    address constant SELF_KISSER = 0x9ee0DC1f7cF1a5c083914e3de197Fd1F484E0578;
    
    // Chronicle Oracle addresses on Mantle Sepolia
    address constant USDC_ORACLE = 0x9Dd500569A6e77ECdDE7694CDc2E58ac587768D0;
    address constant USDT_ORACLE = 0xD671F5F7c2fb6f75439641C36a578842f5b376A9;
    address constant ETH_ORACLE = 0xa6896dCf3f5Dc3c29A5bD3a788D6b7e901e487D8;
    address constant MNT_ORACLE = 0xCE0F753FDEEE2D0EC5F1ba086bD7d5087C20c307;
    
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("==========================================");
        console.log("Whitelisting Chronicle Oracles");
        console.log("==========================================");
        console.log("Deployer Address:", deployerAddress);
        console.log("SelfKisser:", SELF_KISSER);
        
        ISelfKisser selfKisser = ISelfKisser(SELF_KISSER);
        
        // Whitelist deployer address for each oracle
        console.log("\n1. Whitelisting USDC Oracle...");
        selfKisser.selfKiss(USDC_ORACLE);
        console.log("   Whitelisted for USDC Oracle");
        
        console.log("\n2. Whitelisting USDT Oracle...");
        selfKisser.selfKiss(USDT_ORACLE);
        console.log("   Whitelisted for USDT Oracle");
        
        console.log("\n3. Whitelisting ETH Oracle...");
        selfKisser.selfKiss(ETH_ORACLE);
        console.log("   Whitelisted for ETH Oracle");
        
        console.log("\n4. Whitelisting MNT Oracle...");
        selfKisser.selfKiss(MNT_ORACLE);
        console.log("   Whitelisted for MNT Oracle");
        
        console.log("\n==========================================");
        console.log("Whitelisting Complete!");
        console.log("Address", deployerAddress, "is now whitelisted for all Chronicle Oracles");
        console.log("==========================================");
        
        vm.stopBroadcast();
    }
    
    /**
     * @notice Whitelist a specific address (e.g., backend wallet or contract)
     * @param addressToWhitelist The address to whitelist
     */
    function whitelistAddress(address addressToWhitelist) public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        ISelfKisser selfKisser = ISelfKisser(SELF_KISSER);
        
        console.log("Whitelisting address:", addressToWhitelist);
        
        selfKisser.selfKiss(USDC_ORACLE, addressToWhitelist);
        selfKisser.selfKiss(USDT_ORACLE, addressToWhitelist);
        selfKisser.selfKiss(ETH_ORACLE, addressToWhitelist);
        selfKisser.selfKiss(MNT_ORACLE, addressToWhitelist);
        
        console.log("Address whitelisted for all oracles");
        
        vm.stopBroadcast();
    }
}





import {Script, console} from "forge-std/Script.sol";

// SelfKisser ABI
interface ISelfKisser {
    function selfKiss(address oracle) external;
    function selfKiss(address oracle, address who) external;
}

/**
 * @title WhitelistChronicle
 * @notice Whitelist addresses to read from Chronicle Oracles on Mantle Testnet
 * @dev Uses SelfKisser contract to whitelist addresses
 */
contract WhitelistChronicle is Script {
    // SelfKisser address for Mantle Testnet
    address constant SELF_KISSER = 0x9ee0DC1f7cF1a5c083914e3de197Fd1F484E0578;
    
    // Chronicle Oracle addresses on Mantle Sepolia
    address constant USDC_ORACLE = 0x9Dd500569A6e77ECdDE7694CDc2E58ac587768D0;
    address constant USDT_ORACLE = 0xD671F5F7c2fb6f75439641C36a578842f5b376A9;
    address constant ETH_ORACLE = 0xa6896dCf3f5Dc3c29A5bD3a788D6b7e901e487D8;
    address constant MNT_ORACLE = 0xCE0F753FDEEE2D0EC5F1ba086bD7d5087C20c307;
    
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("==========================================");
        console.log("Whitelisting Chronicle Oracles");
        console.log("==========================================");
        console.log("Deployer Address:", deployerAddress);
        console.log("SelfKisser:", SELF_KISSER);
        
        ISelfKisser selfKisser = ISelfKisser(SELF_KISSER);
        
        // Whitelist deployer address for each oracle
        console.log("\n1. Whitelisting USDC Oracle...");
        selfKisser.selfKiss(USDC_ORACLE);
        console.log("   Whitelisted for USDC Oracle");
        
        console.log("\n2. Whitelisting USDT Oracle...");
        selfKisser.selfKiss(USDT_ORACLE);
        console.log("   Whitelisted for USDT Oracle");
        
        console.log("\n3. Whitelisting ETH Oracle...");
        selfKisser.selfKiss(ETH_ORACLE);
        console.log("   Whitelisted for ETH Oracle");
        
        console.log("\n4. Whitelisting MNT Oracle...");
        selfKisser.selfKiss(MNT_ORACLE);
        console.log("   Whitelisted for MNT Oracle");
        
        console.log("\n==========================================");
        console.log("Whitelisting Complete!");
        console.log("Address", deployerAddress, "is now whitelisted for all Chronicle Oracles");
        console.log("==========================================");
        
        vm.stopBroadcast();
    }
    
    /**
     * @notice Whitelist a specific address (e.g., backend wallet or contract)
     * @param addressToWhitelist The address to whitelist
     */
    function whitelistAddress(address addressToWhitelist) public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        ISelfKisser selfKisser = ISelfKisser(SELF_KISSER);
        
        console.log("Whitelisting address:", addressToWhitelist);
        
        selfKisser.selfKiss(USDC_ORACLE, addressToWhitelist);
        selfKisser.selfKiss(USDT_ORACLE, addressToWhitelist);
        selfKisser.selfKiss(ETH_ORACLE, addressToWhitelist);
        selfKisser.selfKiss(MNT_ORACLE, addressToWhitelist);
        
        console.log("Address whitelisted for all oracles");
        
        vm.stopBroadcast();
    }
}

