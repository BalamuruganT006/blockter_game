// src/game/blockchain/RewardClaim.js
import { ethers } from 'ethers';

export class RewardClaimer {
  constructor(gameContract, signer, tokenContract = null) {
    // SpaceShooterGame handles game logic; SpaceToken handles ERC20 tokens
    this.gameContract = gameContract;
    this.tokenContract = tokenContract || gameContract;
    this.signer = signer;
  }

  // Calculate reward based on score (matches contract: score * 1e15)
  calculateReward(score) {
    // Contract rewards: score * 1e15 wei = score * 0.001 TOKEN
    const rewardInEther = score * 0.001;
    return ethers.parseEther(rewardInEther.toFixed(18));
  }

  async claimRewards(score) {
    try {
      // Check if contract is deployed and valid
      if (!this.gameContract || !this.gameContract.address || 
          this.gameContract.address === '0x...') {
        console.warn('Contracts not deployed, returning mock reward');
        
        const mockReward = this.calculateReward(score);
        const mockAmountEther = ethers.formatEther(mockReward);
        
        return {
          success: true,
          txHash: '0x' + Math.random().toString(16).slice(2),
          amount: mockAmountEther,
          newBalance: mockAmountEther,
          blockNumber: Math.floor(Math.random() * 1000000),
          isDemoMode: true
        };
      }

      const address = await this.signer.getAddress();
      
      // Check current high score
      let currentHighScore;
      try {
        currentHighScore = await this.gameContract.highScores(address);
      } catch (statsError) {
        console.warn('Could not fetch high score, proceeding with reward claim:', statsError);
        currentHighScore = null;
      }
      
      // Calculate reward
      const rewardAmount = this.calculateReward(score);
      
      // Check contract token stats
      let contractBalance;
      try {
        contractBalance = await this.tokenContract.balanceOf(
          await this.gameContract.getAddress()
        );
      } catch (balanceError) {
        console.warn('Could not check contract balance:', balanceError);
        contractBalance = rewardAmount; // Assume sufficient balance
      }
      
      if (contractBalance < rewardAmount) {
        return {
          success: false,
          reason: 'Insufficient reward pool balance'
        };
      }

      // Rewards are auto-minted during submitScore in SpaceShooterGame
      // Get current balance from SpaceToken contract
      let newBalance;
      try {
        newBalance = await this.tokenContract.balanceOf(address);
      } catch (newBalanceError) {
        newBalance = rewardAmount;
      }
      
      return {
        success: true,
        amount: ethers.formatEther(rewardAmount),
        newBalance: ethers.formatEther(newBalance)
      };

    } catch (error) {
      console.error('Reward claim failed:', error);
      return {
        success: false,
        reason: error.message,
        code: error.code
      };
    }
  }

  // Check available rewards without claiming
  async checkPendingRewards(address) {
    try {
      const highScore = await this.gameContract.highScores(address);
      const balance = await this.tokenContract.balanceOf(address);
      
      return {
        currentBalance: ethers.formatEther(balance),
        highScore: Number(highScore)
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  // Stake tokens for bonus multipliers
  async stakeTokens(amount) {
    // Implementation for staking mechanism
    // Staked tokens could give score multipliers or special ships
  }

  // Withdraw staked tokens
  async unstakeTokens() {
    // Implementation for unstaking
  }
}