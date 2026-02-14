// src/hooks/useFirebase.js
import { useState, useCallback } from 'react';
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

export const useFirebase = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if Firebase is initialized
  const isFirebaseReady = useCallback(() => {
    if (!db) {
      console.error('Firebase DB not initialized');
      return false;
    }
    return true;
  }, []);

  // Submit score to Firebase (real-time)
  const submitScoreToFirebase = useCallback(async (playerAddress, playerName, score, chainId, txHash = null) => {
    if (!isFirebaseReady()) {
      return { success: false, error: 'Firebase not initialized' };
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔥 Submitting to Firebase:', { playerAddress, playerName, score, chainId });
      
      const playerRef = doc(db, PLAYERS_COLLECTION, playerAddress.toLowerCase());
      const leaderboardRef = doc(db, LEADERBOARD_COLLECTION, playerAddress.toLowerCase());
      
      const batch = writeBatch(db);
      
      const scoreData = {
        address: playerAddress.toLowerCase(),
        name: playerName || 'Anonymous',
        score: Number(score),
        chainId,
        txHash,
        timestamp: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Update player profile
      batch.set(playerRef, {
        ...scoreData,
        totalGames: increment(1),
        lastPlayed: serverTimestamp()
      }, { merge: true });
      
      // Update leaderboard (only if higher score)
      const currentDoc = await getDoc(leaderboardRef);
      const currentScore = currentDoc.exists() ? currentDoc.data().score : 0;
      
      if (score > currentScore) {
        batch.set(leaderboardRef, scoreData);
      }
      
      await batch.commit();
      
      console.log('✅ Score submitted to Firebase successfully');
      return { success: true, isNewHighScore: score > currentScore };
    } catch (err) {
      console.error('❌ Firebase submit error:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [isFirebaseReady]);

  // Get real-time leaderboard
  const subscribeToLeaderboard = useCallback((timeframe = 'all', maxResults = 50, callback) => {
    if (!isFirebaseReady()) {
      console.error('❌ Firebase not ready for subscription');
      callback([]);
      return () => {};
    }
    
    console.log('🔥 Setting up Firebase subscription:', { timeframe, maxResults });
    
    let q;
    
    switch(timeframe) {
      case 'day':
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        q = query(
          collection(db, LEADERBOARD_COLLECTION),
          where('timestamp', '>=', dayAgo),
          orderBy('score', 'desc'),
          limit(maxResults)
        );
        break;
      case 'week':
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        q = query(
          collection(db, LEADERBOARD_COLLECTION),
          where('timestamp', '>=', weekAgo),
          orderBy('score', 'desc'),
          limit(maxResults)
        );
        break;
      default: // 'all'
        q = query(
          collection(db, LEADERBOARD_COLLECTION),
          orderBy('score', 'desc'),
          limit(maxResults)
        );
    }

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log('🔥 Firebase snapshot received:', snapshot.size, 'documents');
        const data = snapshot.docs.map((doc, index) => ({
          rank: index + 1,
          ...doc.data(),
          id: doc.id
        }));
        console.log('✅ Leaderboard data:', data);
        callback(data);
      },
      (err) => {
        console.error('❌ Leaderboard subscription error:', err);
        console.error('Error code:', err.code);
        console.error('Error message:', err.message);
        setError(err.message);
        callback([]);
      }
    );

    return unsubscribe;
  }, [isFirebaseReady]);

  // Get player stats from Firebase
  const getPlayerStatsFromFirebase = useCallback(async (address) => {
    try {
      const docRef = doc(db, PLAYERS_COLLECTION, address.toLowerCase());
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (err) {
      console.error('Get player stats error:', err);
      return null;
    }
  }, []);

  // Batch sync blockchain scores to Firebase (for admin/cron job)
  const syncBlockchainToFirebase = useCallback(async (blockchainScores) => {
    setIsLoading(true);
    try {
      const batch = writeBatch(db);
      
      blockchainScores.forEach((score) => {
        const ref = doc(db, LEADERBOARD_COLLECTION, score.address.toLowerCase());
        batch.set(ref, {
          ...score,
          syncedFromChain: true,
          syncedAt: serverTimestamp()
        }, { merge: true });
      });
      
      await batch.commit();
      return { success: true, count: blockchainScores.length };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Verify score exists on both Firebase and blockchain
  const verifyScore = useCallback(async (address, expectedScore) => {
    try {
      const firebaseDoc = await getDoc(doc(db, LEADERBOARD_COLLECTION, address.toLowerCase()));
      const firebaseScore = firebaseDoc.exists() ? firebaseDoc.data().score : 0;
      
      return {
        firebaseScore,
        matches: firebaseScore === expectedScore,
        firebaseData: firebaseDoc.exists() ? firebaseDoc.data() : null
      };
    } catch (err) {
      return { error: err.message };
    }
  }, []);

  return {
    isLoading,
    error,
    submitScoreToFirebase,
    subscribeToLeaderboard,
    getPlayerStatsFromFirebase,
    syncBlockchainToFirebase,
    verifyScore
  };
};
