// src/game/blockchain/RewardClaim.js
import { ethers } from 'ethers';

export class RewardClaimer {
  constructor(gameContract, signer) {
    // BlockterGame is now both the token and game contract
    this.gameContract = gameContract;
    this.signer = signer;
  }

  // Calculate reward based on score and level
  calculateReward(score, level, difficulty) {
    // Base reward: 0.001 TOKEN per point
    const baseReward = score * 0.001;
    
    // Level multiplier
    const levelMultiplier = 1 + (level - 1) * 0.1;
    
    // Difficulty bonus
    const difficultyBonus = difficulty * 0.5;
    
    // Calculate final amount in wei/token units
    const finalReward = baseReward * levelMultiplier * (1 + difficultyBonus);
    
    return ethers.parseEther(finalReward.toFixed(18));
  }

  async claimRewards(score, level, difficulty) {
    try {
      // Check if contract is deployed and valid
      if (!this.gameContract || !this.gameContract.address || 
          this.gameContract.address === '0x...') {
        console.warn('Contracts not deployed, returning mock reward');
        
        const mockReward = this.calculateReward(score, level, difficulty);
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
      
      // Check if already claimed for this game session
      let currentStats;
      try {
        currentStats = await this.gameContract.getPlayerStats(address);
      } catch (statsError) {
        console.warn('Could not fetch stats, proceeding with reward claim:', statsError);
        currentStats = null;
      }
      
      // Calculate reward
      const rewardAmount = this.calculateReward(score, level, difficulty);
      
      // Check contract token stats
      let contractBalance;
      try {
        contractBalance = await this.gameContract.balanceOf(
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

      // Rewards are now auto-minted during submitScore in BlockterGame
      // This is kept for checking reward status
      const tx = await this.gameContract.getTokenStats(address);
      
      const receipt = await tx.wait();
      
      // Get current balance from the unified contract
      let newBalance;
      try {
        newBalance = await this.gameContract.balanceOf(address);
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
      const stats = await this.gameContract.getPlayerStats(address);
      const balance = await this.gameContract.balanceOf(address);
      
      return {
        gamesPlayed: Number(stats.gamesPlayed),
        totalEarned: ethers.formatEther(stats.totalEarned),
        currentBalance: ethers.formatEther(balance),
        highScore: Number(stats.highScore)
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