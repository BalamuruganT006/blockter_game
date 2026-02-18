// src/hooks/useGameContract.js
import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  CONTRACT_ADDRESSES,
  SpaceShooterGameABI,
  SpaceTokenABI,
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

    // Check if main game contract is deployed
    if (!addresses.SpaceShooterGame) {
      console.warn('SpaceShooterGame contract address not configured yet. Deploy via Remix first.');
      return null;
    }

    try {
      const contracts = {
        game: new ethers.Contract(addresses.SpaceShooterGame, SpaceShooterGameABI, signer),
        nft: addresses.NFTSpaceship ? new ethers.Contract(addresses.NFTSpaceship, NFTSpaceshipABI, signer) : null
      };

      // Add SpaceToken contract if deployed
      if (addresses.SpaceToken) {
        contracts.token = new ethers.Contract(addresses.SpaceToken, SpaceTokenABI, signer);
      }

      return contracts;
    } catch (err) {
      console.error('Failed to create contract instances:', err);
      return null;
    }
  }, [signer, chainId]);

  const submitScore = useCallback(async (score) => {
    if (!signer) throw new Error('Wallet not connected');
    
    setIsSubmitting(true);
    try {
      const contracts = getContracts();
      if (!contracts) throw new Error('Contracts not deployed or not configured');

      const tx = await contracts.game.submitScore(
        score,
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

      const highScore = await contracts.game.highScores(address);
      
      // Get token balance from SpaceToken contract
      let tokenBalance = '0';
      if (contracts.token) {
        const balance = await contracts.token.balanceOf(address);
        tokenBalance = ethers.formatEther(balance);
      }

      return {
        highScore: Number(highScore),
        totalEarned: tokenBalance
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

      // Use SpaceToken contract if available, fallback to game contract
      const tokenContract = contracts.token || contracts.game;
      const balance = await tokenContract.balanceOf(address);
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

  // Admin: Link SpaceToken to SpaceShooterGame (MUST be called once after deploy)
  // Only the SpaceToken owner can call this
  const setupGameContract = useCallback(async () => {
    if (!signer) throw new Error('Wallet not connected');

    try {
      const contracts = getContracts();
      if (!contracts?.token) throw new Error('SpaceToken contract not configured');

      const addresses = CONTRACT_ADDRESSES[chainId];
      const gameAddress = addresses?.SpaceShooterGame;
      if (!gameAddress) throw new Error('SpaceShooterGame address not configured');

      // Check if already set
      const currentGame = await contracts.token.gameContract();
      if (currentGame.toLowerCase() === gameAddress.toLowerCase()) {
        return { success: true, alreadySet: true, gameContract: currentGame };
      }

      const tx = await contracts.token.setGameContract(gameAddress);
      const receipt = await tx.wait();

      return {
        success: true,
        alreadySet: false,
        txHash: receipt.hash || tx.hash,
        gameContract: gameAddress
      };
    } catch (error) {
      console.error('setupGameContract failed:', error);
      throw error;
    }
  }, [signer, chainId, getContracts]);

  // Diagnostic: Check if the SpaceToken -> SpaceShooterGame link is configured
  const checkGameSetup = useCallback(async () => {
    if (!signer) return null;

    try {
      const contracts = getContracts();
      if (!contracts?.token) return { configured: false, reason: 'SpaceToken contract not found' };

      const addresses = CONTRACT_ADDRESSES[chainId];
      const expectedGame = addresses?.SpaceShooterGame;

      const currentGame = await contracts.token.gameContract();
      const isLinked = currentGame.toLowerCase() === expectedGame?.toLowerCase();

      return {
        configured: isLinked,
        currentGameContract: currentGame,
        expectedGameContract: expectedGame,
        reason: isLinked ? 'OK' : 'SpaceToken.setGameContract() has not been called. Rewards cannot be minted.'
      };
    } catch (error) {
      return { configured: false, reason: error.message };
    }
  }, [signer, chainId, getContracts]);

  // Transfer SPACE tokens to another address
  const transferTokens = useCallback(async (toAddress, amount) => {
    if (!signer) throw new Error('Wallet not connected');

    try {
      const contracts = getContracts();
      if (!contracts?.token) throw new Error('SpaceToken contract not configured');

      const amountWei = ethers.parseEther(amount.toString());
      const tx = await contracts.token.transfer(toAddress, amountWei);
      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt.hash || tx.hash
      };
    } catch (error) {
      console.error('Token transfer failed:', error);
      throw error;
    }
  }, [signer, getContracts]);

  return {
    submitScore,
    getPlayerStats,
    getTokenBalance,
    mintNFTShip,
    getPlayerShips,
    setupGameContract,
    checkGameSetup,
    transferTokens,
    isSubmitting,
    lastTxHash,
    getContracts
  };
};