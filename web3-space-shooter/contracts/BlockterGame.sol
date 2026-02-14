// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// ============================================
// BLOCKTER GAME - Unified Contract
// Deploy ONE contract: BlockterGame
// NFTSpaceship is deployed separately
// ============================================

// For Remix: use raw GitHub URLs
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.6/contracts/token/ERC20/ERC20.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.6/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.6/contracts/token/ERC721/ERC721.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.6/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.6/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.6/contracts/security/Pausable.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.6/contracts/access/Ownable.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.6/contracts/security/ReentrancyGuard.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.6/contracts/utils/Counters.sol";

// For Hardhat/npm: uncomment these and comment out the above
// import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
// import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
// import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
// import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
// import "@openzeppelin/contracts/security/Pausable.sol";
// import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
// import "@openzeppelin/contracts/utils/Counters.sol";

// ============================================
// BLOCKTER GAME (ERC20 Token + Game Logic)
// ============================================
// Deployment:
//   1. Deploy BlockterGame() - no constructor args
//   2. Deploy NFTSpaceship("https://your-api.com/ships/")
//   3. Call blockterGame.setNFTContract(nftAddress)
// ============================================

contract BlockterGame is ERC20, ERC20Burnable, Pausable, Ownable, ReentrancyGuard {

    // ============ TOKEN CONFIG ============
    uint256 public constant REWARD_RATE = 1e15;
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18;
    uint256 public constant DAILY_MINT_LIMIT = 1_000_000 * 10**18;

    mapping(address => uint256) public totalRewardsEarned;
    mapping(address => uint256) public lastRewardTime;
    uint256 public currentDay;
    uint256 public dailyMinted;

    // ============ GAME CONFIG ============
    struct Player {
        uint32 highScore;
        uint32 gamesPlayed;
        uint64 totalEarned;
        uint32 lastGameTime;
        string playerName;
    }

    mapping(address => Player) public players;
    mapping(bytes32 => bool) public usedProofs;

    address[100] public leaderboard;
    uint256 public leaderboardLength;

    uint256 public constant MIN_SCORE = 100;
    uint256 public constant SUBMISSION_FEE = 0.001 ether;
    uint256 public constant MAX_NAME_LENGTH = 20;

    // ============ NFT REFERENCE ============
    address public nftContract;

    // ============ EVENTS ============
    event PlayerRewarded(address indexed player, uint256 amount, uint256 score, uint256 timestamp);
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
    event NFTContractUpdated(address indexed nftAddress);

    // (validName checks are inlined in submitScore to reduce stack depth)

    // ============ CONSTRUCTOR ============
    constructor() ERC20("SpaceToken", "SPACE") {
        _mint(msg.sender, 10_000_000 * 10**18);
        currentDay = block.timestamp / 1 days;
    }

    // ============ ADMIN ============
    function setNFTContract(address _nft) external onlyOwner {
        require(_nft != address(0), "Invalid address");
        nftContract = _nft;
        emit NFTContractUpdated(_nft);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function withdrawFees() external onlyOwner {
        uint256 bal = address(this).balance;
        require(bal > 0, "No fees to withdraw");
        payable(owner()).transfer(bal);
    }

    // ============ TOKEN FUNCTIONS ============
    function calculateReward(uint256 score, uint256 level, uint256 difficulty) public pure returns (uint256) {
        uint256 baseReward = score * REWARD_RATE;
        uint256 levelBonus = (baseReward * level) / 10;
        uint256 difficultyBonus = (baseReward * difficulty) / 2;
        return baseReward + levelBonus + difficultyBonus;
    }

    function _rewardPlayer(
        address player,
        uint256 score,
        uint256 level,
        uint256 difficulty
    ) internal returns (uint256) {
        require(player != address(0), "Invalid player");
        require(score > 0, "Invalid score");

        uint256 today = block.timestamp / 1 days;
        if (today > currentDay) {
            currentDay = today;
            dailyMinted = 0;
        }

        uint256 rewardAmount = calculateReward(score, level, difficulty);

        require(dailyMinted + rewardAmount <= DAILY_MINT_LIMIT, "Daily limit reached");
        require(totalSupply() + rewardAmount <= MAX_SUPPLY, "Max supply reached");
        require(block.timestamp >= lastRewardTime[player] + 60, "Reward cooldown active");

        totalRewardsEarned[player] += rewardAmount;
        lastRewardTime[player] = block.timestamp;
        dailyMinted += rewardAmount;

        _mint(player, rewardAmount);

        emit PlayerRewarded(player, rewardAmount, score, block.timestamp);
        return rewardAmount;
    }

    // ============ GAME FUNCTIONS ============
    function submitScore(
        uint32 score,
        uint16 level,
        uint8 difficulty,
        string calldata playerName,
        bytes32 proof
    ) external payable nonReentrant whenNotPaused returns (bool) {
        require(bytes(playerName).length > 0 && bytes(playerName).length <= MAX_NAME_LENGTH, "Bad name");
        require(score >= MIN_SCORE, "Score too low");
        require(msg.value >= SUBMISSION_FEE, "Insufficient fee");
        require(!usedProofs[proof], "Proof already used");
        require(difficulty > 0 && difficulty <= 10, "Invalid difficulty");
        usedProofs[proof] = true;

        bool isNewHigh;
        uint256 reward;

        {
            Player storage p = players[msg.sender];
            isNewHigh = score > p.highScore;
            p.gamesPlayed++;
            p.lastGameTime = uint32(block.timestamp);

            if (bytes(playerName).length > 0 &&
                keccak256(bytes(p.playerName)) != keccak256(bytes(playerName))) {
                p.playerName = playerName;
                emit PlayerRegistered(msg.sender, playerName);
            }

            if (isNewHigh) {
                reward = _processHighScore(p, score, level, difficulty);
            }
        }

        {
            if (msg.value > SUBMISSION_FEE) {
                payable(msg.sender).transfer(msg.value - SUBMISSION_FEE);
            }
            emit ScoreSubmitted(msg.sender, score, level, difficulty, reward, proof);
        }

        return isNewHigh;
    }

    function _processHighScore(
        Player storage p,
        uint32 score,
        uint16 level,
        uint8 difficulty
    ) internal returns (uint256) {
        uint32 oldScore = p.highScore;
        p.highScore = score;

        uint256 reward;
        {
            reward = _rewardPlayer(msg.sender, score, level, difficulty);
            p.totalEarned += uint64(reward / 1e12);
        }
        {
            uint32 playerRank = _updateLeaderboard(msg.sender, score);
            emit NewHighScore(msg.sender, oldScore, score, playerRank);
        }
        return reward;
    }

    // ============ LEADERBOARD ============
    function _updateLeaderboard(address player, uint32 score) internal returns (uint32) {
        for (uint i = 0; i < leaderboardLength; i++) {
            if (leaderboard[i] == player) {
                return _bubbleUp(i);
            }
        }

        if (leaderboardLength < 100) {
            leaderboard[leaderboardLength] = player;
            leaderboardLength++;
            return _bubbleUp(leaderboardLength - 1);
        } else if (score > players[leaderboard[99]].highScore) {
            leaderboard[99] = player;
            return _bubbleUp(99);
        }

        return 0;
    }

    function _bubbleUp(uint256 index) internal returns (uint32) {
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

    // ============ VIEW FUNCTIONS ============
    function getTopPlayers(uint256 count) external view returns (
        address[] memory addrs,
        uint32[] memory scores,
        string[] memory names
    ) {
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

    function getPlayerStats(address player) external view returns (
        uint32 highScore,
        uint32 gamesPlayed,
        uint256 totalEarned,
        uint32 lastGame,
        string memory name,
        uint32 rank
    ) {
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

    function getTokenStats(address player) external view returns (
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

    function verifyProof(bytes32 proof) external view returns (bool valid, bool used) {
        used = usedProofs[proof];
        valid = !used;
    }

    // ============ OVERRIDES ============
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }

    receive() external payable {}
}

// ============================================
// NFT SPACESHIP (ERC721 - separate contract)
// ============================================
// Deploy separately, then call:
//   blockterGame.setNFTContract(nftAddress)
// ============================================

contract NFTSpaceship is ERC721, ERC721Enumerable, ERC721URIStorage, Pausable, Ownable {
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

    function mintShip(uint8 rarity) external payable whenNotPaused returns (uint256) {
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

    function batchMint(uint8[] calldata rarities) external payable whenNotPaused {
        require(rarities.length > 0, "Empty batch");
        require(rarities.length <= MAX_MINT_PER_TX, "Batch too large");
        require(totalSupply() + rarities.length <= MAX_SUPPLY, "Exceeds supply");

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

    function _mintWithStats(address to, uint8 rarity) internal returns (uint256) {
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

    function generateStats(uint8 rarity, uint256 tokenId) internal view returns (ShipStats memory) {
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

    function getPowerLevel(uint256 tokenId) external view returns (uint256) {
        require(_exists(tokenId), "Ship does not exist");
        ShipStats storage s = shipStats[tokenId];
        return uint256(s.speed) + s.fireRate + s.health + s.damage + (s.bonus / 100);
    }

    function getShipsByOwner(address shipOwner) external view returns (
        uint256[] memory tokenIds,
        ShipStats[] memory stats
    ) {
        uint256 balance = balanceOf(shipOwner);
        tokenIds = new uint256[](balance);
        stats = new ShipStats[](balance);

        for (uint i = 0; i < balance; i++) {
            uint256 tid = tokenOfOwnerByIndex(shipOwner, i);
            tokenIds[i] = tid;
            stats[i] = shipStats[tid];
        }
    }

    function getPriceByRarity(uint8 rarity) public pure returns (uint256) {
        if (rarity == 0) return COMMON_PRICE;
        if (rarity == 1) return RARE_PRICE;
        if (rarity == 2) return EPIC_PRICE;
        if (rarity == 3) return LEGENDARY_PRICE;
        revert("Invalid rarity");
    }

    function buildTokenURI(uint8 rarity, uint256 tokenId) internal view returns (string memory) {
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

    function setRarityURI(uint8 rarity, string memory _uri) external onlyOwner {
        rarityURIs[rarity] = _uri;
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds");
        payable(owner()).transfer(balance);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
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

    function toString(uint256 value) internal pure returns (string memory) {
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
