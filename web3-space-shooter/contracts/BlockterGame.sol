// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Remix imports
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.6/contracts/token/ERC20/ERC20.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.6/contracts/token/ERC721/ERC721.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.6/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.6/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.6/contracts/security/Pausable.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.6/contracts/access/Ownable.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.6/contracts/security/ReentrancyGuard.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.6/contracts/utils/Counters.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.6/contracts/utils/Strings.sol";

/// @title BlockterGame — ERC20 token + game logic in one contract
/// Deploy: 1) BlockterGame()  2) NFTSpaceship(baseURI)  3) setNFTContract(nft)
contract BlockterGame is ERC20, Pausable, Ownable, ReentrancyGuard {

    uint256 public constant REWARD_RATE = 1e15;
    uint256 public constant MAX_SUPPLY = 100_000_000e18;
    uint256 public constant DAILY_MINT_LIMIT = 1_000_000e18;
    uint256 public constant MIN_SCORE = 100;
    uint256 public constant SUBMISSION_FEE = 0.001 ether;

    struct Player {
        uint32 highScore;
        uint32 gamesPlayed;
        uint64 totalEarned;
        uint32 lastGameTime;
        string playerName;
    }

    mapping(address => Player) public players;
    mapping(address => uint256) public totalRewardsEarned;
    mapping(address => uint256) public lastRewardTime;
    mapping(bytes32 => bool) public usedProofs;
    address[100] public leaderboard;
    uint256 public leaderboardLength;
    uint256 public currentDay;
    uint256 public dailyMinted;
    address public nftContract;

    event PlayerRewarded(address indexed player, uint256 amount, uint256 score, uint256 timestamp);
    event ScoreSubmitted(address indexed player, uint32 score, uint16 level, uint8 difficulty, uint256 reward, bytes32 indexed proof);
    event NewHighScore(address indexed player, uint32 oldScore, uint32 newScore, uint32 rank);
    event PlayerRegistered(address indexed player, string name);
    event NFTContractUpdated(address indexed nftAddress);

    error BadInput();

    constructor() ERC20("SpaceToken", "SPACE") {
        _mint(msg.sender, 10_000_000e18);
        currentDay = block.timestamp / 1 days;
    }

    // --- Admin ---
    function setNFTContract(address _nft) external onlyOwner { require(_nft != address(0)); nftContract = _nft; emit NFTContractUpdated(_nft); }
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
    function withdrawFees() external onlyOwner { uint256 b = address(this).balance; require(b > 0); payable(owner()).transfer(b); }

    // --- Token reward ---
    function calculateReward(uint256 score, uint256 level, uint256 difficulty) public pure returns (uint256) {
        uint256 base = score * REWARD_RATE;
        return base + (base * level) / 10 + (base * difficulty) / 2;
    }

    function _rewardPlayer(uint256 score, uint16 level, uint8 difficulty) internal returns (uint256) {
        uint256 today = block.timestamp / 1 days;
        if (today > currentDay) { currentDay = today; dailyMinted = 0; }
        uint256 amt = calculateReward(score, level, difficulty);
        require(dailyMinted + amt <= DAILY_MINT_LIMIT && totalSupply() + amt <= MAX_SUPPLY);
        require(block.timestamp >= lastRewardTime[msg.sender] + 60);
        totalRewardsEarned[msg.sender] += amt;
        lastRewardTime[msg.sender] = block.timestamp;
        dailyMinted += amt;
        _mint(msg.sender, amt);
        emit PlayerRewarded(msg.sender, amt, score, block.timestamp);
        return amt;
    }

    // --- Game ---
    function submitScore(
        uint32 score, uint16 level, uint8 difficulty,
        string calldata playerName, bytes32 proof
    ) external payable nonReentrant whenNotPaused returns (bool) {
        uint256 nameLen = bytes(playerName).length;
        if (nameLen == 0 || nameLen > 20 || score < MIN_SCORE || msg.value < SUBMISSION_FEE ||
            usedProofs[proof] || difficulty == 0 || difficulty > 10) revert BadInput();
        usedProofs[proof] = true;

        bool isNewHigh;
        uint256 reward;
        {
            Player storage p = players[msg.sender];
            isNewHigh = score > p.highScore;
            p.gamesPlayed++;
            p.lastGameTime = uint32(block.timestamp);
            if (keccak256(bytes(p.playerName)) != keccak256(bytes(playerName))) {
                p.playerName = playerName;
                emit PlayerRegistered(msg.sender, playerName);
            }
            if (isNewHigh) { reward = _processHighScore(p, score, level, difficulty); }
        }
        {
            if (msg.value > SUBMISSION_FEE) payable(msg.sender).transfer(msg.value - SUBMISSION_FEE);
            emit ScoreSubmitted(msg.sender, score, level, difficulty, reward, proof);
        }
        return isNewHigh;
    }

    function _processHighScore(Player storage p, uint32 score, uint16 level, uint8 difficulty) internal returns (uint256) {
        uint32 old = p.highScore;
        p.highScore = score;
        uint256 reward;
        { reward = _rewardPlayer(score, level, difficulty); p.totalEarned += uint64(reward / 1e12); }
        { uint32 rank = _updateLeaderboard(msg.sender, score); emit NewHighScore(msg.sender, old, score, rank); }
        return reward;
    }

    // --- Leaderboard ---
    function _updateLeaderboard(address player, uint32 score) internal returns (uint32) {
        for (uint i; i < leaderboardLength; i++) {
            if (leaderboard[i] == player) return _bubbleUp(i);
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

    function _bubbleUp(uint256 idx) internal returns (uint32) {
        while (idx > 0 && players[leaderboard[idx]].highScore > players[leaderboard[idx - 1]].highScore) {
            (leaderboard[idx], leaderboard[idx - 1]) = (leaderboard[idx - 1], leaderboard[idx]);
            idx--;
        }
        return uint32(idx + 1);
    }

    // --- Views ---
    function getTopPlayers(uint256 count) external view returns (address[] memory a, uint32[] memory s, string[] memory n) {
        uint256 c = count > leaderboardLength ? leaderboardLength : count;
        a = new address[](c); s = new uint32[](c); n = new string[](c);
        for (uint i; i < c; i++) {
            a[i] = leaderboard[i]; s[i] = players[a[i]].highScore; n[i] = players[a[i]].playerName;
        }
    }

    function getPlayerStats(address player) external view returns (
        uint32 highScore, uint32 gamesPlayed, uint256 totalEarned, uint32 lastGame, string memory name, uint32 rank
    ) {
        Player storage p = players[player];
        highScore = p.highScore; gamesPlayed = p.gamesPlayed;
        totalEarned = uint256(p.totalEarned) * 1e12; lastGame = p.lastGameTime; name = p.playerName;
        for (uint i; i < leaderboardLength; i++) { if (leaderboard[i] == player) { rank = uint32(i + 1); break; } }
    }

    function getTokenStats(address player) external view returns (uint256 earned, uint256 lastReward, uint256 bal, uint256 cooldown) {
        earned = totalRewardsEarned[player]; lastReward = lastRewardTime[player]; bal = balanceOf(player);
        uint256 next = lastRewardTime[player] + 60;
        cooldown = block.timestamp < next ? next - block.timestamp : 0;
    }

    function verifyProof(bytes32 proof) external view returns (bool valid, bool used) {
        used = usedProofs[proof]; valid = !used;
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override whenNotPaused { super._beforeTokenTransfer(from, to, amount); }
    receive() external payable {}
}

/// @title NFTSpaceship — ERC721 ships, deploy separately then link via setNFTContract
contract NFTSpaceship is ERC721, ERC721Enumerable, ERC721URIStorage, Pausable, Ownable {
    using Counters for Counters.Counter;
    using Strings for uint256;
    Counters.Counter private _tokenIdCounter;

    struct ShipStats { uint8 speed; uint8 fireRate; uint8 health; uint8 damage; uint8 rarity; uint16 bonus; uint32 mintTime; }

    uint256[4] private _prices = [0.01 ether, 0.05 ether, 0.1 ether, 0.5 ether];
    uint256 public constant MAX_MINT_PER_TX = 10;
    uint256 public constant MAX_SUPPLY = 10000;

    mapping(uint256 => ShipStats) public shipStats;
    mapping(address => uint256) public mintedByAddress;
    mapping(uint8 => uint256) public mintedByRarity;
    string public baseTokenURI;
    string[4] private _rarityNames = ["common", "rare", "epic", "legendary"];

    event ShipMinted(address indexed shipOwner, uint256 indexed tokenId, uint8 rarity, ShipStats stats);
    event BatchMinted(address indexed shipOwner, uint256[] tokenIds, uint256 totalCost);

    constructor(string memory _baseURI) ERC721("SpaceShip NFT", "SHIP") { baseTokenURI = _baseURI; }

    function mintShip(uint8 rarity) external payable whenNotPaused returns (uint256) {
        require(rarity <= 3 && totalSupply() < MAX_SUPPLY);
        uint256 price = _prices[rarity];
        require(msg.value >= price);
        uint256 id = _mintWithStats(msg.sender, rarity);
        if (msg.value > price) payable(msg.sender).transfer(msg.value - price);
        return id;
    }

    function batchMint(uint8[] calldata rarities) external payable whenNotPaused {
        uint256 len = rarities.length;
        require(len > 0 && len <= MAX_MINT_PER_TX && totalSupply() + len <= MAX_SUPPLY);
        uint256 cost; uint256[] memory ids = new uint256[](len);
        for (uint i; i < len; i++) { require(rarities[i] <= 3); cost += _prices[rarities[i]]; }
        require(msg.value >= cost);
        for (uint i; i < len; i++) ids[i] = _mintWithStats(msg.sender, rarities[i]);
        if (msg.value > cost) payable(msg.sender).transfer(msg.value - cost);
        emit BatchMinted(msg.sender, ids, cost);
    }

    function _mintWithStats(address to, uint8 rarity) internal returns (uint256) {
        _tokenIdCounter.increment();
        uint256 id = _tokenIdCounter.current();
        ShipStats memory s = _genStats(rarity, id);
        shipStats[id] = s;
        mintedByAddress[to]++;
        mintedByRarity[rarity]++;
        _safeMint(to, id);
        _setTokenURI(id, string(abi.encodePacked(baseTokenURI, _rarityNames[rarity], "/", id.toString(), ".json")));
        emit ShipMinted(to, id, rarity, s);
        return id;
    }

    function _genStats(uint8 rarity, uint256 id) internal view returns (ShipStats memory s) {
        uint256 seed = uint256(keccak256(abi.encodePacked(blockhash(block.number-1), block.timestamp, msg.sender, id)));
        uint8 b = [5,7,9,10][rarity];
        s = ShipStats(
            b + uint8(seed % 4), b + uint8((seed>>8) % 4),
            b + uint8((seed>>16) % 4), b + uint8((seed>>24) % 4),
            rarity, rarity >= 2 ? uint16((seed>>32) % 1000) : 0, uint32(block.timestamp)
        );
    }

    function getPowerLevel(uint256 id) external view returns (uint256) {
        require(_exists(id)); ShipStats storage s = shipStats[id];
        return uint256(s.speed) + s.fireRate + s.health + s.damage + (s.bonus / 100);
    }

    function getShipsByOwner(address owner_) external view returns (uint256[] memory ids, ShipStats[] memory stats) {
        uint256 bal = balanceOf(owner_);
        ids = new uint256[](bal); stats = new ShipStats[](bal);
        for (uint i; i < bal; i++) { ids[i] = tokenOfOwnerByIndex(owner_, i); stats[i] = shipStats[ids[i]]; }
    }

    function getPriceByRarity(uint8 rarity) public view returns (uint256) { require(rarity <= 3); return _prices[rarity]; }
    function setBaseURI(string memory u) external onlyOwner { baseTokenURI = u; }
    function withdraw() external onlyOwner { uint256 b = address(this).balance; require(b > 0); payable(owner()).transfer(b); }
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // Required overrides
    function _beforeTokenTransfer(address f, address t, uint256 id, uint256 bs) internal override(ERC721, ERC721Enumerable) whenNotPaused { super._beforeTokenTransfer(f,t,id,bs); }
    function _burn(uint256 id) internal override(ERC721, ERC721URIStorage) { super._burn(id); }
    function tokenURI(uint256 id) public view override(ERC721, ERC721URIStorage) returns (string memory) { return super.tokenURI(id); }
    function supportsInterface(bytes4 iid) public view override(ERC721, ERC721Enumerable, ERC721URIStorage) returns (bool) { return super.supportsInterface(iid); }
}
