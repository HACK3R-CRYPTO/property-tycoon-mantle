// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./PropertyNFT.sol";
import "./GameToken.sol";

contract QuestSystem is Ownable {
    PropertyNFT public propertyNFT;
    GameToken public gameToken;
    
    enum QuestType { 
        FirstProperty,
        DiversifyPortfolio,
        YieldMaster,
        PropertyMogul,
        RWAPioneer
    }
    
    struct Quest {
        QuestType questType;
        string name;
        string description;
        uint256 reward;
        bool isActive;
    }
    
    struct PlayerProgress {
        mapping(QuestType => bool) completedQuests;
        mapping(QuestType => uint256) questProgress;
        uint256 totalQuestsCompleted;
    }
    
    mapping(QuestType => Quest) public quests;
    mapping(address => PlayerProgress) public playerProgress;
    
    event QuestCompleted(address indexed player, QuestType questType, uint256 reward);
    event QuestProgressUpdated(address indexed player, QuestType questType, uint256 progress);
    
    constructor(address _propertyNFT, address _gameToken) Ownable(msg.sender) {
        propertyNFT = PropertyNFT(_propertyNFT);
        gameToken = GameToken(_gameToken);
        
        _initializeQuests();
    }
    
    function _initializeQuests() private {
        quests[QuestType.FirstProperty] = Quest({
            questType: QuestType.FirstProperty,
            name: "First Property",
            description: "Mint your first property",
            reward: 100 * 10**18,
            isActive: true
        });
        
        quests[QuestType.DiversifyPortfolio] = Quest({
            questType: QuestType.DiversifyPortfolio,
            name: "Diversify Portfolio",
            description: "Own 3 different property types",
            reward: 500 * 10**18,
            isActive: true
        });
        
        quests[QuestType.YieldMaster] = Quest({
            questType: QuestType.YieldMaster,
            name: "Yield Master",
            description: "Collect yield 7 days in a row",
            reward: 1000 * 10**18,
            isActive: true
        });
        
        quests[QuestType.PropertyMogul] = Quest({
            questType: QuestType.PropertyMogul,
            name: "Property Mogul",
            description: "Own 10 properties",
            reward: 2000 * 10**18,
            isActive: true
        });
        
        quests[QuestType.RWAPioneer] = Quest({
            questType: QuestType.RWAPioneer,
            name: "RWA Pioneer",
            description: "Link 5 properties to RWA",
            reward: 1500 * 10**18,
            isActive: true
        });
    }
    
    function checkFirstPropertyQuest(address player) public {
        Quest storage quest = quests[QuestType.FirstProperty];
        require(quest.isActive, "Quest not active");
        require(!playerProgress[player].completedQuests[QuestType.FirstProperty], "Already completed");
        
        uint256 propertyCount = propertyNFT.getOwnerPropertyCount(player);
        require(propertyCount >= 1, "Requirement not met");
        
        playerProgress[player].completedQuests[QuestType.FirstProperty] = true;
        playerProgress[player].totalQuestsCompleted++;
        
        gameToken.mint(player, quest.reward);
        emit QuestCompleted(player, QuestType.FirstProperty, quest.reward);
    }
    
    function checkDiversifyPortfolioQuest(address player) public {
        Quest storage quest = quests[QuestType.DiversifyPortfolio];
        require(quest.isActive, "Quest not active");
        require(!playerProgress[player].completedQuests[QuestType.DiversifyPortfolio], "Already completed");
        
        uint256[] memory properties = propertyNFT.getOwnerProperties(player);
        require(properties.length >= 3, "Not enough properties");
        
        bool[4] memory hasType;
        for (uint256 i = 0; i < properties.length; i++) {
            PropertyNFT.Property memory prop = propertyNFT.getProperty(properties[i]);
            hasType[uint256(prop.propertyType)] = true;
        }
        
        uint256 typeCount = 0;
        for (uint256 i = 0; i < 4; i++) {
            if (hasType[i]) typeCount++;
        }
        
        require(typeCount >= 3, "Not diversified");
        
        playerProgress[player].completedQuests[QuestType.DiversifyPortfolio] = true;
        playerProgress[player].totalQuestsCompleted++;
        
        gameToken.mint(player, quest.reward);
        emit QuestCompleted(player, QuestType.DiversifyPortfolio, quest.reward);
    }
    
    function checkPropertyMogulQuest(address player) public {
        Quest storage quest = quests[QuestType.PropertyMogul];
        require(quest.isActive, "Quest not active");
        require(!playerProgress[player].completedQuests[QuestType.PropertyMogul], "Already completed");
        
        uint256 propertyCount = propertyNFT.getOwnerPropertyCount(player);
        require(propertyCount >= 10, "Requirement not met");
        
        playerProgress[player].completedQuests[QuestType.PropertyMogul] = true;
        playerProgress[player].totalQuestsCompleted++;
        
        gameToken.mint(player, quest.reward);
        emit QuestCompleted(player, QuestType.PropertyMogul, quest.reward);
    }
    
    function checkRWAPioneerQuest(address player) public {
        Quest storage quest = quests[QuestType.RWAPioneer];
        require(quest.isActive, "Quest not active");
        require(!playerProgress[player].completedQuests[QuestType.RWAPioneer], "Already completed");
        
        uint256[] memory properties = propertyNFT.getOwnerProperties(player);
        uint256 linkedCount = 0;
        
        for (uint256 i = 0; i < properties.length; i++) {
            PropertyNFT.Property memory prop = propertyNFT.getProperty(properties[i]);
            if (prop.rwaContract != address(0)) {
                linkedCount++;
            }
        }
        
        require(linkedCount >= 5, "Not enough RWA links");
        
        playerProgress[player].completedQuests[QuestType.RWAPioneer] = true;
        playerProgress[player].totalQuestsCompleted++;
        
        gameToken.mint(player, quest.reward);
        emit QuestCompleted(player, QuestType.RWAPioneer, quest.reward);
    }
    
    function batchCheckQuests(address player, QuestType[] calldata questTypes) public {
        for (uint256 i = 0; i < questTypes.length; i++) {
            if (questTypes[i] == QuestType.FirstProperty) {
                checkFirstPropertyQuest(player);
            } else if (questTypes[i] == QuestType.DiversifyPortfolio) {
                checkDiversifyPortfolioQuest(player);
            } else if (questTypes[i] == QuestType.PropertyMogul) {
                checkPropertyMogulQuest(player);
            } else if (questTypes[i] == QuestType.RWAPioneer) {
                checkRWAPioneerQuest(player);
            }
        }
    }
    
    function hasCompletedQuest(address player, QuestType questType) public view returns (bool) {
        return playerProgress[player].completedQuests[questType];
    }
    
    function getTotalQuestsCompleted(address player) public view returns (uint256) {
        return playerProgress[player].totalQuestsCompleted;
    }
    
    /**
     * @notice Owner can update quest reward
     * @dev Allows changing rewards without redeploying
     */
    function updateQuestReward(QuestType questType, uint256 newReward) public onlyOwner {
        require(quests[questType].questType == questType, "Invalid quest type");
        quests[questType].reward = newReward;
    }
    
    /**
     * @notice Owner can enable/disable a quest
     * @dev Allows disabling quests without redeploying
     */
    function setQuestActive(QuestType questType, bool isActive) public onlyOwner {
        require(quests[questType].questType == questType, "Invalid quest type");
        quests[questType].isActive = isActive;
    }
    
    /**
     * @notice Owner can update quest description
     * @dev Allows updating quest info without redeploying
     */
    function updateQuestDescription(QuestType questType, string memory newDescription) public onlyOwner {
        require(quests[questType].questType == questType, "Invalid quest type");
        quests[questType].description = newDescription;
    }
}

