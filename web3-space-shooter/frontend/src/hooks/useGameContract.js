// src/hooks/useGameContract.js
import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  CONTRACT_ADDRESSES,
  BlockterGameABI,
  NFTSpaceshipABI
} from '../contracts/addresses';

export const useGameContract = (signer, chainId) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastTxHash, setLastTxHash] = useState(null);

  const getContracts = useCallback(() => {
    if (!signer || !chainId) return null;
    
    const addresses = CONTRACT_ADDRESSES[chainId];
    if (!addresses) {
      console.warn('No contract addresses for chain:', chainId);
      return null;
    }

    // Check if contracts are deployed (addresses filled in)
    if (!addresses.BlockterGame || !addresses.NFTSpaceship) {
      console.warn('Contract addresses not configured yet. Deploy via Remix first.');
      return null;
    }

    try {
      return {
        game: new ethers.Contract(addresses.BlockterGame, BlockterGameABI, signer),
        nft: new ethers.Contract(addresses.NFTSpaceship, NFTSpaceshipABI, signer)
      };
    } catch (err) {
      console.error('Failed to create contract instances:', err);
      return null;
    }
  }, [signer, chainId]);

  const submitScore = useCallback(async (score, playerName, level = 1, difficulty = 1) => {
    if (!signer) throw new Error('Wallet not connected');
    
    setIsSubmitting(true);
    try {
      const contracts = getContracts();
      if (!contracts) throw new Error('Contracts not deployed or not configured');

      // Generate proof hash
      const account = await signer.getAddress();
      const proof = ethers.keccak256(ethers.toUtf8Bytes(
        `${account}-${score}-${Date.now()}`
      ));

      const tx = await contracts.game.submitScore(
        score,
        level,
        difficulty,
        playerName,
        proof,
        {
          value: ethers.parseEther("0.001"), // SUBMISSION_FEE
          gasLimit: 300000
        }
      );
      
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
      if (!contracts) return null;

      const stats = await contracts.game.getPlayerStats(address);
      
      return {
        highScore: Number(stats.highScore),
        gamesPlayed: Number(stats.gamesPlayed),
        totalEarned: ethers.formatEther(stats.totalEarned),
        lastGame: Number(stats.lastGame),
        playerName: stats.name,
        rank: Number(stats.rank)
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
      if (!contracts) return '0';

      const balance = await contracts.game.balanceOf(address);
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
      if (!contracts) throw new Error('Contracts not deployed');

      const tx = await contracts.nft.mintShip(rarity, {
        value: ethers.parseEther(value),
        gasLimit: 400000
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
      if (!contracts) return [];

      // Use the batch getShipsByOwner function
      const [tokenIds, stats] = await contracts.nft.getShipsByOwner(address);
      
      return tokenIds.map((tokenId, i) => ({
        tokenId: Number(tokenId),
        speed: stats[i].speed,
        fireRate: stats[i].fireRate,
        health: stats[i].health,
        damage: stats[i].damage,
        rarity: stats[i].rarity,
        bonus: stats[i].bonus,
        mintTime: Number(stats[i].mintTime)
      }));
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