// src/hooks/useFirebaseLeaderboard.js
import { useState, useEffect, useCallback } from 'react';
import {
  db,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  increment,
  LEADERBOARD_COLLECTION,
  PLAYERS_COLLECTION
} from '../config/firebase';

const SYNC_QUEUE_COLLECTION = 'syncQueue';

export const useFirebaseLeaderboard = (web3Data) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [playerStats, setPlayerStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, synced, error

  // Real-time leaderboard subscription
  useEffect(() => {
    if (!db) return;

    const q = query(
      collection(db, LEADERBOARD_COLLECTION),
      orderBy('score', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc, index) => ({
        rank: index + 1,
        id: doc.id,
        ...doc.data(),
        isCurrentPlayer: doc.id.toLowerCase() === web3Data?.account?.toLowerCase()
      }));
      setLeaderboard(data);
    }, (error) => {
      console.error('Leaderboard subscription error:', error);
    });

    return () => unsubscribe();
  }, [web3Data?.account]);

  // Get player stats from Firebase
  const getPlayerStats = useCallback(async (address) => {
    if (!address) return null;
    
    try {
      const docRef = doc(db, PLAYERS_COLLECTION, address.toLowerCase());
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPlayerStats(data);
        return data;
      }
      return null;
    } catch (error) {
      console.error('Get player stats error:', error);
      return null;
    }
  }, []);

  // Submit score to Firebase (immediate, real-time)
  const submitScoreToFirebase = useCallback(async (scoreData) => {
    const { 
      address, 
      name, 
      score, 
      level, 
      difficulty, 
      chainId, 
      txHash = null,
      isNewHighScore = false 
    } = scoreData;

    if (!address) throw new Error('Address required');

    setIsLoading(true);
    setSyncStatus('syncing');

    try {
      const batch = writeBatch(db);
      const playerRef = doc(db, PLAYERS_COLLECTION, address.toLowerCase());
      const leaderboardRef = doc(db, LEADERBOARD_COLLECTION, address.toLowerCase());

      // Player profile update
      batch.set(playerRef, {
        address: address.toLowerCase(),
        name: name || 'Anonymous',
        lastScore: score,
        gamesPlayed: increment(1),
        lastPlayed: serverTimestamp(),
        chainId,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Only update leaderboard if high score
      if (isNewHighScore) {
        batch.set(leaderboardRef, {
          address: address.toLowerCase(),
          name: name || 'Anonymous',
          score: score,
          level,
          difficulty,
          chainId,
          txHash,
          timestamp: serverTimestamp(),
          verified: !!txHash
        });

        // Add to sync queue for blockchain verification
        if (txHash) {
          const syncRef = doc(collection(db, SYNC_QUEUE_COLLECTION));
          batch.set(syncRef, {
            address: address.toLowerCase(),
            score,
            txHash,
            chainId,
            status: 'pending',
            createdAt: serverTimestamp()
          });
        }
      }

      await batch.commit();
      setSyncStatus('synced');
      
      return { success: true, isNewHighScore };
    } catch (error) {
      console.error('Firebase submit error:', error);
      setSyncStatus('error');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Hybrid submit: Firebase first, then blockchain
  const submitScoreHybrid = useCallback(async ({
    score,
    level,
    difficulty,
    playerName,
    proof,
    gameContract // Your deployed BlockterGame contract instance
  }) => {
    if (!web3Data?.signer || !gameContract) {
      throw new Error('Web3 not connected');
    }

    const address = web3Data.account;
    
    // Step 1: Check current high score from Firebase
    const currentStats = await getPlayerStats(address);
    const currentHigh = currentStats?.score || 0;
    const isNewHighScore = score > currentHigh;

    // Step 2: Submit to Firebase immediately (fast feedback)
    await submitScoreToFirebase({
      address,
      name: playerName,
      score,
      level,
      difficulty,
      chainId: web3Data.chainId,
      isNewHighScore
    });

    // Step 3: If new high score, submit to blockchain (permanent)
    let txHash = null;
    if (isNewHighScore) {
      try {
        const { ethers } = await import('ethers');
        const tx = await gameContract.submitScore(
          score,
          level,
          difficulty,
          playerName,
          proof,
          { value: ethers.parseEther("0.001") } // SUBMISSION_FEE
        );
        
        const receipt = await tx.wait();
        txHash = receipt.hash || receipt.transactionHash;

        // Update Firebase with blockchain verification
        await submitScoreToFirebase({
          address,
          name: playerName,
          score,
          level,
          difficulty,
          chainId: web3Data.chainId,
          txHash,
          isNewHighScore: true
        });

      } catch (blockchainError) {
        console.error('Blockchain submission failed:', blockchainError);
        // Firebase score remains, marked as unverified
      }
    }

    return {
      success: true,
      isNewHighScore,
      txHash,
      verified: !!txHash
    };
  }, [web3Data, submitScoreToFirebase, getPlayerStats]);

  // Sync blockchain data to Firebase (for admin/periodic sync)
  const syncFromBlockchain = useCallback(async (gameContract, maxEntries = 100) => {
    setSyncStatus('syncing');
    setIsLoading(true);

    try {
      const { ethers } = await import('ethers');

      // Get on-chain leaderboard
      const [addresses, scores, names] = await gameContract.getTopPlayers(maxEntries);
      
      const batch = writeBatch(db);
      
      for (let i = 0; i < addresses.length; i++) {
        if (addresses[i] === ethers.ZeroAddress) continue;
        
        const ref = doc(db, LEADERBOARD_COLLECTION, addresses[i].toLowerCase());
        batch.set(ref, {
          address: addresses[i].toLowerCase(),
          name: names[i] || 'Unknown',
          score: Number(scores[i]),
          rank: i + 1,
          syncedFromChain: true,
          syncedAt: serverTimestamp(),
          verified: true
        }, { merge: true });
      }

      await batch.commit();
      setSyncStatus('synced');
      
      return { success: true, count: addresses.length };
    } catch (error) {
      console.error('Blockchain sync error:', error);
      setSyncStatus('error');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Verify a specific score exists on-chain
  const verifyScoreOnChain = useCallback(async (gameContract, address, expectedScore) => {
    try {
      const stats = await gameContract.getPlayerStats(address);
      const onChainScore = Number(stats.highScore);
      
      return {
        matches: onChainScore === expectedScore,
        onChainScore,
        expectedScore,
        playerName: stats.name
      };
    } catch (error) {
      return { error: error.message };
    }
  }, []);

  return {
    leaderboard,
    playerStats,
    isLoading,
    syncStatus,
    getPlayerStats,
    submitScoreToFirebase,
    submitScoreHybrid,
    syncFromBlockchain,
    verifyScoreOnChain
  };
};
