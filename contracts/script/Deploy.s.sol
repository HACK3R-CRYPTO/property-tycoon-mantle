// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {GameToken} from "../src/GameToken.sol";
import {PropertyNFT} from "../src/PropertyNFT.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        GameToken gameToken = new GameToken();
        console.log("GameToken deployed at:", address(gameToken));
        
        PropertyNFT propertyNFT = new PropertyNFT();
        console.log("PropertyNFT deployed at:", address(propertyNFT));
        
        YieldDistributor yieldDistributor = new YieldDistributor(
            address(propertyNFT),
            address(gameToken)
        );
        console.log("YieldDistributor deployed at:", address(yieldDistributor));
        
        vm.stopBroadcast();
    }
}
