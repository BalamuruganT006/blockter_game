// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// ============================================
// IMPORTS - Use Remix built-in OpenZeppelin
// Compile with: Solidity 0.8.19, EVM Version: paris
// ============================================

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

// ============================================
// 1. SPACE TOKEN (ERC-20) - SHARDEUM OPTIMIZED
// ============================================

contract SpaceToken is ERC20, ERC20Burnable, Pausable, Ownable {
    
    // Shardeum: Lower gas fees, optimize for frequent mints
    uint256 public constant REWARD_RATE = 1e15; // 0.001 tokens per point
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18; // 100M tokens
    uint256 public constant DAILY_MINT_LIMIT = 1_000_000 * 10**18; // 1M per day
    
    address public gameContract;
    
    mapping(address => uint256) public totalRewardsEarned;
    mapping(address => uint256) public lastRewardTime;
    
    uint256 public currentDay;
    uint256 public dailyMinted;
    
    event PlayerRewarded(
        address indexed player, 
        uint256 amount, 
        uint256 score, 
        uint256 timestamp
    );
    event GameContractUpdated(address indexed newGameContract);
    
    modifier onlyGameContract() {
        require(msg.sender == gameContract, "SpaceToken: unauthorized");
        _;
    }
    
    constructor() ERC20("SpaceToken", "SPACE") {
        // Mint initial supply to deployer
        _mint(msg.sender, 10_000_000 * 10**18); // 10M initial
        currentDay = block.timestamp / 1 days;
    }
    
    function setGameContract(address _gameContract) external onlyOwner {
        require(_gameContract != address(0), "Invalid address");
        gameContract = _gameContract;
        emit GameContractUpdated(_gameContract);
    }
    
    function calculateReward(
        uint256 score, 
        uint256 level, 
        uint256 difficulty
    ) public pure returns (uint256) {
        uint256 baseReward = score * REWARD_RATE;
        uint256 levelBonus = (baseReward * level) / 10;
        uint256 difficultyBonus = (baseReward * difficulty) / 2;
        return baseReward + levelBonus + difficultyBonus;
    }
    
    function rewardPlayer(
        address player, 
        uint256 score, 
        uint256 level, 
        uint256 difficulty
    ) external onlyGameContract whenNotPaused returns (uint256) {
        require(player != address(0), "Invalid player");
        require(score > 0, "Invalid score");
        
        uint256 today = block.timestamp / 1 days;
        if (today > currentDay) {
            currentDay = today;
            dailyMinted = 0;
        }
        
        uint256 rewardAmount = calculateReward(score, level, difficulty);
        
        require(
            dailyMinted + rewardAmount <= DAILY_MINT_LIMIT, 
            "Daily limit reached"
        );
        require(
            totalSupply() + rewardAmount <= MAX_SUPPLY, 
            "Max supply reached"
        );
        require(
            block.timestamp >= lastRewardTime[player] + 60, 
            "Reward cooldown active"
        );
        
        totalRewardsEarned[player] += rewardAmount;
        lastRewardTime[player] = block.timestamp;
        dailyMinted += rewardAmount;
        
        _mint(player, rewardAmount);
        
        emit PlayerRewarded(player, rewardAmount, score, block.timestamp);
        return rewardAmount;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function getPlayerStats(address player) external view returns (
        uint256 totalEarned,
        uint256 lastReward,
        uint256 balance,
        uint256 cooldownRemaining
    ) {
        totalEarned = totalRewardsEarned[player];
        lastReward = lastRewardTime[player];
        balance = balanceOf(player);
        
        if (block.timestamp < lastRewardTime[player] + 60) {
            cooldownRemaining = (lastRewardTime[player] + 60) - block.timestamp;
        } else {
            cooldownRemaining = 0;
        }
    }
    
    // CRITICAL: Required override for ERC20 + Pausable
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20) whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }
}

// ============================================
// 2. SPACE SHOOTER GAME - SHARDEUM TESTNET
// ============================================

contract SpaceShooterGame is ReentrancyGuard {
    
    // Packed struct for gas optimization on Shardeum
    struct Player {
        uint32 highScore;
        uint32 gamesPlayed;
        uint64 totalEarned;
        uint32 lastGameTime;
        string playerName;
    }
    
    SpaceToken public token;
    address public owner;
    
    mapping(address => Player) public players;
    mapping(bytes32 => bool) public usedProofs;
    
    // Fixed size array for leaderboard (gas efficient)
    address[100] public leaderboard;
    uint256 public leaderboardLength;
    
    uint256 public constant MIN_SCORE = 100;
    uint256 public constant SUBMISSION_FEE = 0.001 ether;
    uint256 public constant MAX_NAME_LENGTH = 20;
    
    event ScoreSubmitted(
        address indexed player,
        uint32 score,
        uint16 level,
        uint8 difficulty,
        uint256 reward,
        bytes32 indexed proof
    );
    
    event NewHighScore(
        address indexed player,
        uint32 oldScore,
        uint32 newScore,
        uint32 rank
    );
    
    event PlayerRegistered(address indexed player, string name);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Unauthorized");
        _;
    }
    
    modifier validName(string memory name) {
        require(bytes(name).length > 0, "Name empty");
        require(bytes(name).length <= MAX_NAME_LENGTH, "Name too long");
        _;
    }
    
    constructor(address _token) {
        require(_token != address(0), "Invalid token address");
        token = SpaceToken(_token);
        owner = msg.sender;
    }
    
    function submitScore(
        uint32 score,
        uint16 level,
        uint8 difficulty,
        string calldata playerName,
        bytes32 proof
    ) external payable validName(playerName) nonReentrant returns (bool) {
        require(score >= MIN_SCORE, "Score too low");
        require(msg.value >= SUBMISSION_FEE, "Insufficient fee");
        require(!usedProofs[proof], "Proof already used");
        require(difficulty > 0 && difficulty <= 10, "Invalid difficulty");
        
        usedProofs[proof] = true;
        
        address player = msg.sender;
        Player storage p = players[player];
        
        bool isNewHigh = score > p.highScore;
        uint32 oldScore = p.highScore;
        
        if (isNewHigh) {
            p.highScore = score;
        }
        
        p.gamesPlayed++;
        p.lastGameTime = uint32(block.timestamp);
        
        // Update name if provided and different
        if (bytes(playerName).length > 0) {
            bytes32 currentNameHash = keccak256(bytes(p.playerName));
            bytes32 newNameHash = keccak256(bytes(playerName));
            if (currentNameHash != newNameHash) {
                p.playerName = playerName;
                emit PlayerRegistered(player, playerName);
            }
        }
        
        uint256 reward = 0;
        
        // ============================================
        // FIXED LINE 243 AREA - Use 'score' not 'newScore'
        // ============================================
        if (isNewHigh) {
            reward = token.rewardPlayer(player, score, level, difficulty);
            p.totalEarned += uint64(reward / 1e12);
            uint32 playerRank = updateLeaderboard(player, score);
            emit NewHighScore(player, oldScore, score, playerRank);
        }
        // ============================================
        
        // Refund excess fee
        if (msg.value > SUBMISSION_FEE) {
            payable(player).transfer(msg.value - SUBMISSION_FEE);
        }
        
        emit ScoreSubmitted(player, score, level, difficulty, reward, proof);
        
        return isNewHigh;
    }
    
    function updateLeaderboard(address player, uint32 score) 
        internal 
        returns (uint32) 
    {
        // Check if player already in leaderboard
        for (uint i = 0; i < leaderboardLength; i++) {
            if (leaderboard[i] == player) {
                return bubbleUp(i);
            }
        }
        
        // Add new player
        if (leaderboardLength < 100) {
            leaderboard[leaderboardLength] = player;
            leaderboardLength++;
            return bubbleUp(leaderboardLength - 1);
        } else if (score > players[leaderboard[99]].highScore) {
            leaderboard[99] = player;
            return bubbleUp(99);
        }
        
        return 0;
    }
    
    function bubbleUp(uint256 index) internal returns (uint32) {
        while (index > 0) {
            address current = leaderboard[index];
            address above = leaderboard[index - 1];
            
            if (players[current].highScore > players[above].highScore) {
                leaderboard[index - 1] = current;
                leaderboard[index] = above;
                index--;
            } else {
                break;
            }
        }
        return uint32(index + 1);
    }
    
    function getTopPlayers(uint256 count) 
        external 
        view 
        returns (
            address[] memory addrs,
            uint32[] memory scores,
            string[] memory names
        ) 
    {
        uint256 resultCount = count > leaderboardLength ? leaderboardLength : count;
        
        addrs = new address[](resultCount);
        scores = new uint32[](resultCount);
        names = new string[](resultCount);
        
        for (uint i = 0; i < resultCount; i++) {
            address player = leaderboard[i];
            addrs[i] = player;
            scores[i] = players[player].highScore;
            names[i] = players[player].playerName;
        }
        
        return (addrs, scores, names);
    }
    
    function getPlayerStats(address player) 
        external 
        view 
        returns (
            uint32 highScore,
            uint32 gamesPlayed,
            uint256 totalEarned,
            uint32 lastGame,
            string memory name,
            uint32 rank
        ) 
    {
        Player storage p = players[player];
        highScore = p.highScore;
        gamesPlayed = p.gamesPlayed;
        totalEarned = uint256(p.totalEarned) * 1e12;
        lastGame = p.lastGameTime;
        name = p.playerName;
        
        for (uint i = 0; i < leaderboardLength; i++) {
            if (leaderboard[i] == player) {
                rank = uint32(i + 1);
                break;
            }
        }
    }
    
    function verifyProof(bytes32 proof) 
        external 
        view 
        returns (bool valid, bool used) 
    {
        used = usedProofs[proof];
        valid = !used;
    }
    
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner).transfer(balance);
    }
    
    function setToken(address _token) external onlyOwner {
        require(_token != address(0), "Invalid address");
        token = SpaceToken(_token);
    }
    
    function pauseGame() external onlyOwner {
        token.pause();
    }
    
    function unpauseGame() external onlyOwner {
        token.unpause();
    }
    
    receive() external payable {}
}

// ============================================
// 3. NFT SPACESHIP - SHARDEUM TESTNET
// ============================================

contract NFTSpaceship is 
    ERC721, 
    ERC721Enumerable, 
    ERC721URIStorage, 
    Pausable, 
    Ownable 
{
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;
    
    struct ShipStats {
        uint8 speed;
        uint8 fireRate;
        uint8 health;
        uint8 damage;
        uint8 rarity;
        uint16 bonus;
        uint32 mintTime;
    }
    
    uint256 public constant COMMON_PRICE = 0.01 ether;
    uint256 public constant RARE_PRICE = 0.05 ether;
    uint256 public constant EPIC_PRICE = 0.1 ether;
    uint256 public constant LEGENDARY_PRICE = 0.5 ether;
    uint256 public constant MAX_MINT_PER_TX = 10;
    uint256 public constant MAX_SUPPLY = 10000;
    
    mapping(uint256 => ShipStats) public shipStats;
    mapping(address => uint256) public mintedByAddress;
    mapping(uint8 => uint256) public mintedByRarity;
    
    string public baseTokenURI;
    mapping(uint8 => string) public rarityURIs;
    
    event ShipMinted(
        address indexed shipOwner,
        uint256 indexed tokenId,
        uint8 rarity,
        ShipStats stats
    );
    
    event BatchMinted(
        address indexed shipOwner,
        uint256[] tokenIds,
        uint256 totalCost
    );
    
    constructor(string memory _baseURI) ERC721("SpaceShip NFT", "SHIP") {
        baseTokenURI = _baseURI;
        rarityURIs[0] = "common";
        rarityURIs[1] = "rare";
        rarityURIs[2] = "epic";
        rarityURIs[3] = "legendary";
    }
    
    function mintShip(uint8 rarity) 
        external 
        payable 
        whenNotPaused 
        returns (uint256) 
    {
        require(rarity <= 3, "Invalid rarity");
        require(totalSupply() < MAX_SUPPLY, "Max supply reached");
        
        uint256 price = getPriceByRarity(rarity);
        require(msg.value >= price, "Insufficient payment");
        
        uint256 tokenId = _mintWithStats(msg.sender, rarity);
        
        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }
        
        return tokenId;
    }
    
    function batchMint(uint8[] calldata rarities) 
        external 
        payable 
        whenNotPaused 
    {
        require(rarities.length > 0, "Empty batch");
        require(rarities.length <= MAX_MINT_PER_TX, "Batch too large");
        require(
            totalSupply() + rarities.length <= MAX_SUPPLY, 
            "Exceeds supply"
        );
        
        uint256 totalCost = 0;
        uint256[] memory tokenIds = new uint256[](rarities.length);
        
        for (uint i = 0; i < rarities.length; i++) {
            require(rarities[i] <= 3, "Invalid rarity");
            totalCost += getPriceByRarity(rarities[i]);
        }
        
        require(msg.value >= totalCost, "Insufficient payment");
        
        for (uint i = 0; i < rarities.length; i++) {
            tokenIds[i] = _mintWithStats(msg.sender, rarities[i]);
        }
        
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
        
        emit BatchMinted(msg.sender, tokenIds, totalCost);
    }
    
    function _mintWithStats(address to, uint8 rarity) 
        internal 
        returns (uint256) 
    {
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        
        ShipStats memory stats = generateStats(rarity, tokenId);
        shipStats[tokenId] = stats;
        
        mintedByAddress[to]++;
        mintedByRarity[rarity]++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, buildTokenURI(rarity, tokenId));
        
        emit ShipMinted(to, tokenId, rarity, stats);
        
        return tokenId;
    }
    
    function generateStats(uint8 rarity, uint256 tokenId) 
        internal 
        view 
        returns (ShipStats memory) 
    {
        uint256 seed = uint256(keccak256(abi.encodePacked(
            blockhash(block.number - 1),
            block.timestamp,
            msg.sender,
            tokenId
        )));
        
        ShipStats memory stats;
        stats.rarity = rarity;
        stats.mintTime = uint32(block.timestamp);
        
        uint8[4] memory base = [5, 7, 9, 10];
        
        stats.speed = base[rarity] + uint8(seed % 4);
        stats.fireRate = base[rarity] + uint8((seed >> 8) % 4);
        stats.health = base[rarity] + uint8((seed >> 16) % 4);
        stats.damage = base[rarity] + uint8((seed >> 24) % 4);
        
        if (rarity >= 2) {
            stats.bonus = uint16((seed >> 32) % 1000);
        }
        
        return stats;
    }
    
    function getPowerLevel(uint256 tokenId) 
        external 
        view 
        returns (uint256) 
    {
        require(_exists(tokenId), "Ship does not exist");
        ShipStats storage s = shipStats[tokenId];
        return uint256(s.speed) + s.fireRate + s.health + s.damage + (s.bonus / 100);
    }
    
    function getShipsByOwner(address shipOwner) 
        external 
        view 
        returns (
            uint256[] memory tokenIds,
            ShipStats[] memory stats
        ) 
    {
        uint256 balance = balanceOf(shipOwner);
        tokenIds = new uint256[](balance);
        stats = new ShipStats[](balance);
        
        for (uint i = 0; i < balance; i++) {
            uint256 tid = tokenOfOwnerByIndex(shipOwner, i);
            tokenIds[i] = tid;
            stats[i] = shipStats[tid];
        }
    }
    
    function getPriceByRarity(uint8 rarity) 
        public 
        pure 
        returns (uint256) 
    {
        if (rarity == 0) return COMMON_PRICE;
        if (rarity == 1) return RARE_PRICE;
        if (rarity == 2) return EPIC_PRICE;
        if (rarity == 3) return LEGENDARY_PRICE;
        revert("Invalid rarity");
    }
    
    function buildTokenURI(uint8 rarity, uint256 tokenId) 
        internal 
        view 
        returns (string memory) 
    {
        return string(abi.encodePacked(
            baseTokenURI,
            rarityURIs[rarity],
            "/",
            toString(tokenId),
            ".json"
        ));
    }
    
    function setBaseURI(string memory _newBaseURI) external onlyOwner {
        baseTokenURI = _newBaseURI;
    }
    
    function setRarityURI(uint8 rarity, string memory _uri) 
        external 
        onlyOwner 
    {
        rarityURIs[rarity] = _uri;
    }
    
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds");
        payable(owner()).transfer(balance);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // ========== REQUIRED OVERRIDES ==========
    
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }
    
    function _burn(uint256 tokenId) 
        internal 
        override(ERC721, ERC721URIStorage) 
    {
        super._burn(tokenId);
    }
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    // Utility function
    function toString(uint256 value) 
        internal 
        pure 
        returns (string memory) 
    {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}