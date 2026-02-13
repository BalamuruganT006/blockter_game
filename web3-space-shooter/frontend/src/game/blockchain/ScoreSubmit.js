// src/game/blockchain/ScoreSubmit.js
import { ethers } from 'ethers';

export class ScoreSubmitter {
  constructor(contract, signer) {
    this.contract = contract;
    this.signer = signer;
    this.pendingSubmissions = [];
  }

  async submitScore(score, playerName, options = {}) {
    try {
      // Check if contract is deployed and valid
      if (!this.contract || !this.contract.address || this.contract.address === '0x...') {
        console.warn('Contract not deployed, returning mock success');
        return {
          success: true,
          txHash: '0x' + Math.random().toString(16).slice(2),
          blockNumber: Math.floor(Math.random() * 1000000),
          gasUsed: '50000',
          newHighScore: score,
          isDemoMode: true
        };
      }

      // Validate score
      if (score < 0 || score > 999999999) {
        throw new Error('Invalid score range');
      }

      // Check if new high score
      const address = await this.signer.getAddress();
      
      try {
        const currentStats = await this.contract.getPlayerStats(address);
        
        if (score <= Number(currentStats.highScore)) {
          return {
            success: false,
            reason: 'Not a new high score',
            currentHighScore: Number(currentStats.highScore)
          };
        }
      } catch (statsError) {
        console.warn('Could not fetch current stats, allowing submission:', statsError);
        // Allow submission if stats can't be fetched
      }

      // Prepare transaction
      const txOptions = {
        gasLimit: options.gasLimit || 200000,
        value: options.value || 0
      };

      // Submit to blockchain
      const tx = await this.contract.submitScore(score, playerName, txOptions);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        newHighScore: score
      };

    } catch (error) {
      console.error('Score submission failed:', error);
      
      // Parse error
      if (error.code === 'ACTION_REJECTED') {
        return { success: false, reason: 'User rejected transaction' };
      }
      if (error.code === 'INSUFFICIENT_FUNDS') {
        return { success: false, reason: 'Insufficient SHM for gas' };
      }
      
      return { 
        success: false, 
        reason: error.message || 'Transaction failed',
        error 
      };
    }
  }

  // Batch submission for tournament mode
  async submitBatchScores(scores) {
    // Implementation for submitting multiple scores
    // Useful for tournament leaderboards
  }

  // Verify score on-chain
  async verifyScoreSubmission(txHash) {
    try {
      const provider = this.contract.runner.provider;
      const receipt = await provider.getTransactionReceipt(txHash);
      
      if (!receipt) return { verified: false, reason: 'Transaction not found' };
      
      // Parse event logs
      const eventSignature = 'NewHighScore(address,uint256,uint256)';
      const eventTopic = ethers.id(eventSignature);
      
      const eventLog = receipt.logs.find(log => log.topics[0] === eventTopic);
      
      if (eventLog) {
        const decoded = this.contract.interface.decodeEventLog(
          'NewHighScore',
          eventLog.data,
          eventLog.topics
        );
        
        return {
          verified: true,
          player: decoded.player,
          score: Number(decoded.score),
          timestamp: Number(decoded.timestamp)
        };
      }
      
      return { verified: false, reason: 'Event not found in receipt' };
      
    } catch (error) {
      return { verified: false, reason: error.message };
    }
  }
}