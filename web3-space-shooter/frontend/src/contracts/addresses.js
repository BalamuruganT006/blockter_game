// src/contracts/addresses.js
// Fill in contract addresses after deploying via Remix
//
// Deployment steps:
//   1. Deploy BlockterGame (no constructor args) -> get BlockterGame address
//   2. Deploy NFTSpaceship("https://your-api.com/ships/") -> get NFTSpaceship address
//   3. Call blockterGame.setNFTContract(nftAddress)

// Owner / Deployer wallet
export const OWNER_ADDRESS = "0x7dD916dB8562F32349D132342139FF8C5A389Eb8";

export const CONTRACT_ADDRESSES = {
  // Shardeum EVM Testnet (Mezame)
  8119: {
    BlockterGame: "0x245A0364AEf9A8ef6eC8E83aaEC1Cd08fBb7f878",
    NFTSpaceship: "",    // Fill after deploying NFTSpaceship
    deployedAt: "2026-02-15"
  }
};

// ============================================
// BlockterGame ABI (ERC20 Token + Game Logic)
// ============================================

export const BlockterGameABI = [
  // --- ERC20 Token ---
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function calculateReward(uint256 score, uint256 level, uint256 difficulty) pure returns (uint256)",
  "function getTokenStats(address player) view returns (uint256 totalEarned, uint256 lastReward, uint256 balance, uint256 cooldownRemaining)",

  // --- Game ---
  "function submitScore(uint32 score, uint16 level, uint8 difficulty, string playerName, bytes32 proof) payable returns (bool)",
  "function getTopPlayers(uint256 count) view returns (address[] addrs, uint32[] scores, string[] names)",
  "function getPlayerStats(address player) view returns (uint32 highScore, uint32 gamesPlayed, uint256 totalEarned, uint32 lastGame, string name, uint32 rank)",
  "function verifyProof(bytes32 proof) view returns (bool valid, bool used)",
  "function players(address) view returns (uint32 highScore, uint32 gamesPlayed, uint64 totalEarned, uint32 lastGameTime, string playerName)",
  "function leaderboardLength() view returns (uint256)",
  "function MIN_SCORE() view returns (uint256)",
  "function SUBMISSION_FEE() view returns (uint256)",
  "function nftContract() view returns (address)",

  // --- Events ---
  "event PlayerRewarded(address indexed player, uint256 amount, uint256 score, uint256 timestamp)",
  "event ScoreSubmitted(address indexed player, uint32 score, uint16 level, uint8 difficulty, uint256 reward, bytes32 indexed proof)",
  "event NewHighScore(address indexed player, uint32 oldScore, uint32 newScore, uint32 rank)",
  "event PlayerRegistered(address indexed player, string name)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

// ============================================
// NFTSpaceship ABI (ERC721 - separate contract)
// ============================================

export const NFTSpaceshipABI = [
  "function mintShip(uint8 rarity) payable returns (uint256)",
  "function batchMint(uint8[] rarities) payable",
  "function shipStats(uint256 tokenId) view returns (uint8 speed, uint8 fireRate, uint8 health, uint8 damage, uint8 rarity, uint16 bonus, uint32 mintTime)",
  "function getPowerLevel(uint256 tokenId) view returns (uint256)",
  "function getShipsByOwner(address shipOwner) view returns (uint256[] tokenIds, tuple(uint8 speed, uint8 fireRate, uint8 health, uint8 damage, uint8 rarity, uint16 bonus, uint32 mintTime)[] stats)",
  "function getPriceByRarity(uint8 rarity) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function totalSupply() view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function MAX_SUPPLY() view returns (uint256)",
  "event ShipMinted(address indexed owner, uint256 indexed tokenId, uint8 rarity, tuple(uint8 speed, uint8 fireRate, uint8 health, uint8 damage, uint8 rarity, uint16 bonus, uint32 mintTime) stats)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];
