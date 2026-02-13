// src/hooks/useGameContract.js
import { useState, useCallback } from 'react';
import { ethers } from 'ethers';

// Contract ABIs (abbreviated for space - use full ABI from Remix)
const GAME_CONTRACT_ABI = [
  "function submitScore(uint256 score, string memory name) external",
  "function getPlayerStats(address player) external view returns (tuple(uint256 highScore, uint256 gamesPlayed, uint256 totalEarned, string playerName))",
  "function getTopPlayers(uint256 count) external view returns (address[] memory)",
  "function players(address) external view returns (uint256 highScore, uint256 gamesPlayed, uint256 totalEarned, string memory playerName)",
  "event NewHighScore(address player, uint256 score, uint256 timestamp)"
];

const TOKEN_CONTRACT_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function rewardPlayer(address player, uint256 score) external",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)"
];

const NFT_CONTRACT_ABI = [
  "function mintShip(string memory rarity) external payable",
  "function shipStats(uint256 tokenId) external view returns (tuple(uint8 speed, uint8 fireRate, uint8 health, uint8 damage, string metadataURI))",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)",
  "function balanceOf(address owner) external view returns (uint256)"
];

// Mock leaderboard data for testing (until contracts are deployed)
const MOCK_LEADERBOARD = [
  { address: '0x1234567890123456789012345678901234567890', name: 'CyberNinja', highScore: 5420, gamesPlayed: 24, totalEarned: '125.50' },
  { address: '0x2345678901234567890123456789012345678901', name: 'SpaceAce', highScore: 4890, gamesPlayed: 18, totalEarned: '98.30' },
  { address: '0x3456789012345678901234567890123456789012', name: 'NovaStrike', highScore: 4350, gamesPlayed: 16, totalEarned: '87.60' },
  { address: '0x4567890123456789012345678901234567890123', name: 'QuantumRider', highScore: 3920, gamesPlayed: 14, totalEarned: '76.45' },
  { address: '0x5678901234567890123456789012345678901234', name: 'PhantomFlash', highScore: 3540, gamesPlayed: 13, totalEarned: '65.20' },
  { address: '0x6789012345678901234567890123456789012345', name: 'VortexPilot', highScore: 3180, gamesPlayed: 11, totalEarned: '54.10' },
  { address: '0x7890123456789012345678901234567890123456', name: 'SonicBurst', highScore: 2890, gamesPlayed: 10, totalEarned: '45.75' },
  { address: '0x8901234567890123456789012345678901234567', name: 'IceBreaker', highScore: 2450, gamesPlayed: 9, totalEarned: '38.90' },
  { address: '0x9012345678901234567890123456789012345678', name: 'BlazeFury', highScore: 2120, gamesPlayed: 8, totalEarned: '32.15' },
  { address: '0xa123456789012345678901234567890123456789', name: 'StormChaser', highScore: 1890, gamesPlayed: 7, totalEarned: '28.50' }
];

const CONTRACTS = {
  mainnet: {
    game: '0x...', // Replace with deployed addresses
    token: '0x...',
    nft: '0x...'
  },
  testnet: {
    game: '0x...',
    token: '0x...',
    nft: '0x...'
  }
};

export const useGameContract = (signer, chainId) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastTxHash, setLastTxHash] = useState(null);

  const getContracts = useCallback(() => {
    if (!signer) return null;
    
    const network = chainId === 8118 ? 'mainnet' : 'testnet';
    const addresses = CONTRACTS[network];

    return {
      game: new ethers.Contract(addresses.game, GAME_CONTRACT_ABI, signer),
      token: new ethers.Contract(addresses.token, TOKEN_CONTRACT_ABI, signer),
      nft: new ethers.Contract(addresses.nft, NFT_CONTRACT_ABI, signer)
    };
  }, [signer, chainId]);

  const submitScore = useCallback(async (score, playerName) => {
    if (!signer) throw new Error('Wallet not connected');
    
    setIsSubmitting(true);
    try {
      const contracts = getContracts();
      const tx = await contracts.game.submitScore(score, playerName, {
        gasLimit: 200000
      });
      
      setLastTxHash(tx.hash);
      const receipt = await tx.wait();
      
      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('Score submission failed:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [signer, getContracts]);

  const getPlayerStats = useCallback(async (address) => {
    if (!signer) return null;
    
    try {
      const contracts = getContracts();
      const stats = await contracts.game.getPlayerStats(address);
      
      return {
        highScore: Number(stats.highScore),
        gamesPlayed: Number(stats.gamesPlayed),
        totalEarned: ethers.formatEther(stats.totalEarned),
        playerName: stats.playerName
      };
    } catch (error) {
      console.error('Failed to get player stats:', error);
      return null;
    }
  }, [signer, getContracts]);

  const getTokenBalance = useCallback(async (address) => {
    if (!signer) return '0';
    
    try {
      const contracts = getContracts();
      const balance = await contracts.token.balanceOf(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get token balance:', error);
      return '0';
    }
  }, [signer, getContracts]);

  const mintNFTShip = useCallback(async (rarity, value) => {
    if (!signer) throw new Error('Wallet not connected');
    
    try {
      const contracts = getContracts();
      const tx = await contracts.nft.mintShip(rarity, {
        value: ethers.parseEther(value),
        gasLimit: 300000
      });
      
      const receipt = await tx.wait();
      return {
        success: true,
        txHash: tx.hash,
        tokenId: receipt.logs[0].topics[3] // Extract token ID from event
      };
    } catch (error) {
      console.error('NFT minting failed:', error);
      throw error;
    }
  }, [signer, getContracts]);

  const getPlayerShips = useCallback(async (address) => {
    if (!signer) return [];
    
    try {
      const contracts = getContracts();
      const balance = await contracts.nft.balanceOf(address);
      
      const ships = [];
      for (let i = 0; i < balance; i++) {
        const tokenId = await contracts.nft.tokenOfOwnerByIndex(address, i);
        const stats = await contracts.nft.shipStats(tokenId);
        
        ships.push({
          tokenId: Number(tokenId),
          speed: stats.speed,
          fireRate: stats.fireRate,
          health: stats.health,
          damage: stats.damage,
          metadataURI: stats.metadataURI
        });
      }
      
      return ships;
    } catch (error) {
      console.error('Failed to get player ships:', error);
      return [];
    }
  }, [signer, getContracts]);

  return {
    submitScore,
    getPlayerStats,
    getTokenBalance,
    mintNFTShip,
    getPlayerShips,
    isSubmitting,
    lastTxHash,
    getContracts
  };
};