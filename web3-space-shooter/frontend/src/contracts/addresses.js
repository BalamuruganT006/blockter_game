// src/contracts/addresses.js
// Fill in contract addresses after deploying via Remix
//
// Deployment steps:
//   1. Deploy SpaceToken(walletAddress) -> get SpaceToken address
//   2. Deploy SpaceShooterGame(tokenAddress) -> get SpaceShooterGame address
//   3. Call spaceToken.setGameContract(gameAddress)
//   4. Deploy NFTSpaceship() -> get NFTSpaceship address

// Owner / Deployer wallet
export const OWNER_ADDRESS = "0x7dD916dB8562F32349D132342139FF8C5A389Eb8";

export const CONTRACT_ADDRESSES = {
  // Shardeum EVM Testnet (Mezame)
  8119: {
    SpaceShooterGame: "0x4851214E850C29a6670bC2971019428089334F74",
    SpaceToken: "0xAfa22964ACCe901DeBb5ec4a9c7E6d1F1159f673",
    NFTSpaceship: "",    // Fill after deploying NFTSpaceship
    deployedAt: "2026-02-17"
  }
};

// ============================================
// SpaceShooterGame ABI (Game Logic)
// ============================================

export const SpaceShooterGameABI = [
  // --- Game ---
  "function submitScore(uint256 score) payable",
  "function highScores(address) view returns (uint256)",
  "function token() view returns (address)",
  "function owner() view returns (address)",
  "function MIN_SCORE() view returns (uint256)",
  "function SUBMISSION_FEE() view returns (uint256)",
  "function withdrawFees()"
];

// ============================================
// SpaceToken ABI (ERC20 Token - separate contract)
// ============================================

export const SpaceTokenABI = [
  // --- ERC20 Standard ---
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",

  // --- SpaceToken Specific ---
  "function INITIAL_SUPPLY() view returns (uint256)",
  "function MAX_SUPPLY() view returns (uint256)",
  "function gameContract() view returns (address)",
  "function setGameContract(address _game)",
  "function rewardPlayer(address player, uint256 amount)",
  "function rescueERC20(address token, uint256 amount)",
  "function pause()",
  "function unpause()",

  // --- Events ---
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
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
