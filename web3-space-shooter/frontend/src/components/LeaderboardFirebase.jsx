// src/components/Leaderboard.jsx
import { useState, useEffect } from 'react';
import { useGameContract } from '../hooks/useGameContract';
import { useFirebase } from '../hooks/useFirebase';

// Mock leaderboard data for testing (until Firebase is configured)
const MOCK_LEADERBOARD = [
  { address: '0x1234567890123456789012345678901234567890', name: 'CyberNinja', score: 5420, games: 24, earned: '125.50', chainId: 8119 },
  { address: '0x2345678901234567890123456789012345678901', name: 'SpaceAce', score: 4890, games: 18, earned: '98.30', chainId: 8119 },
  { address: '0x3456789012345678901234567890123456789012', name: 'NovaStrike', score: 4350, games: 16, earned: '87.60', chainId: 8119 },
  { address: '0x4567890123456789012345678901234567890123', name: 'QuantumRider', score: 3920, games: 14, earned: '76.45', chainId: 8119 },
  { address: '0x5678901234567890123456789012345678901234', name: 'PhantomFlash', score: 3540, games: 13, earned: '65.20', chainId: 8119 },
  { address: '0x6789012345678901234567890123456789012345', name: 'VortexPilot', score: 3180, games: 11, earned: '54.10', chainId: 8119 },
  { address: '0x7890123456789012345678901234567890123456', name: 'SonicBurst', score: 2890, games: 10, earned: '45.75', chainId: 8119 },
  { address: '0x8901234567890123456789012345678901234567', name: 'IceBreaker', score: 2450, games: 9, earned: '38.90', chainId: 8119 },
  { address: '0x9012345678901234567890123456789012345678', name: 'BlazeFury', score: 2120, games: 8, earned: '32.15', chainId: 8119 },
  { address: '0xa123456789012345678901234567890123456789', name: 'StormChaser', score: 1890, games: 7, earned: '28.50', chainId: 8119 }
];

export default function Leaderboard({ web3Data }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('all');
  const [playerRank, setPlayerRank] = useState(null);
  const [syncStatus, setSyncStatus] = useState('firebase'); // 'firebase', 'blockchain', 'syncing'
  const [lastSync, setLastSync] = useState(null);
  const [dataSource, setDataSource] = useState('mock'); // 'mock', 'firebase', 'blockchain'

  const { getPlayerStats } = useGameContract(web3Data?.signer, web3Data?.chainId);
  const { 
    subscribeToLeaderboard, 
    syncBlockchainToFirebase,
    isLoading: firebaseLoading,
    error: firebaseError
  } = useFirebase();

  // Subscribe to real-time Firebase updates
  useEffect(() => {
    setLoading(true);
    let unsubscribe = null;
    let timeoutId = null;
    let firebaseAttempted = false;
    
    const setupSubscription = () => {
      try {
        console.log('📡 Attempting Firebase subscription...');
        firebaseAttempted = true;
        
        // Try to subscribe to Firebase for real-time updates
        unsubscribe = subscribeToLeaderboard(timeframe, 50, (data) => {
          if (data && data.length > 0) {
            console.log('✅ Firebase data received:', data.length, 'entries');
            setLeaderboard(data);
            setDataSource('firebase');
            setLoading(false);
            
            // Clear timeout since Firebase worked
            if (timeoutId) clearTimeout(timeoutId);
            
            // Find player rank
            if (web3Data?.account) {
              const rank = data.findIndex(p => 
                p.address?.toLowerCase() === web3Data.account.toLowerCase()
              );
              setPlayerRank(rank !== -1 ? rank + 1 : null);
            }
          } else {
            console.log('⚠️ Firebase returned empty data, using mock data');
            loadMockData();
          }
        });
      } catch (error) {
        console.error('❌ Firebase subscription error:', error);
        loadMockData();
      }
    };
    
    // Set up subscription
    setupSubscription();
    
    // Fallback: if Firebase doesn't respond in 3 seconds, show mock data
    timeoutId = setTimeout(() => {
      if (loading && !firebaseAttempted) {
        console.log('⏱️ Firebase timeout, loading mock data...');
        loadMockData();
      }
    }, 3000);

    // Cleanup subscription
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [timeframe, web3Data, subscribeToLeaderboard]);

  const loadMockData = () => {
    // Add ranks to mock data
    const leaderboardData = MOCK_LEADERBOARD.map((player, index) => ({
      ...player,
      rank: index + 1,
      isCurrentPlayer: web3Data?.account?.toLowerCase() === player.address.toLowerCase()
    }));

    setLeaderboard(leaderboardData);
    setDataSource('mock');
    setLoading(false);
    
    // Set player rank if connected
    const userRank = leaderboardData.find(p => p.isCurrentPlayer)?.rank;
    if (userRank) {
      setPlayerRank(userRank);
    }
  };

  // Manual sync from blockchain
  const handleManualSync = async () => {
    if (!web3Data?.signer || dataSource === 'mock') return;
    
    setSyncStatus('syncing');
    setLoading(true);
    
    try {
      // Simulate fetching from blockchain and syncing to Firebase
      // In production, this would call your smart contract's getTopPlayers
      await new Promise(r => setTimeout(r, 2000));
      
      setLastSync(new Date());
      setSyncStatus('firebase');
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('firebase');
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return '0x...';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getRankStyle = (rank) => {
    if (rank === 1) return 'rank-gold';
    if (rank === 2) return 'rank-silver';
    if (rank === 3) return 'rank-bronze';
    return '';
  };

  const getTimeframeLabel = () => {
    const labels = { all: 'All Time', week: 'This Week', day: 'Today' };
    return labels[timeframe];
  };

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <div className="title-section">
          <h2 className="cyber-title">LEADERBOARD</h2>
          <span className="sync-badge" data-status={syncStatus}>
            {syncStatus === 'firebase' && dataSource === 'firebase' && '⚡ Live'}
            {syncStatus === 'firebase' && dataSource === 'mock' && '📝 Demo'}
            {syncStatus === 'blockchain' && '⛓ Syncing...'}
            {syncStatus === 'syncing' && '🔄 Updating...'}
          </span>
        </div>
        
        <div className="controls-section">
          <div className="timeframe-tabs">
            <button 
              className={timeframe === 'day' ? 'active' : ''}
              onClick={() => setTimeframe('day')}
            >
              24H
            </button>
            <button 
              className={timeframe === 'week' ? 'active' : ''}
              onClick={() => setTimeframe('week')}
            >
              7D
            </button>
            <button 
              className={timeframe === 'all' ? 'active' : ''}
              onClick={() => setTimeframe('all')}
            >
              ALL TIME
            </button>
          </div>
          
          {dataSource === 'firebase' && (
            <button 
              className="sync-btn"
              onClick={handleManualSync}
              disabled={syncStatus === 'syncing'}
            >
              🔄 Sync Chain
            </button>
          )}
        </div>
      </div>

      {lastSync && (
        <div className="sync-info">
          Last blockchain sync: {lastSync.toLocaleTimeString()}
        </div>
      )}

      {web3Data?.account && playerRank && (
        <div className="player-rank-banner">
          <div className="rank-info">
            <span className="rank-label">Your Rank</span>
            <span className="rank-number">#{playerRank}</span>
          </div>
          <div className="rank-details">
            <span>Top {Math.round((playerRank / leaderboard.length) * 100)}%</span>
          </div>
        </div>
      )}

      <div className="leaderboard-stats">
        <div className="stat-pill">
          <span className="stat-value">{leaderboard.length}</span>
          <span className="stat-label">Players</span>
        </div>
        <div className="stat-pill">
          <span className="stat-value">
            {leaderboard[0]?.score?.toLocaleString() || 0}
          </span>
          <span className="stat-label">Top Score</span>
        </div>
      </div>

      <div className="leaderboard-table">
        <div className="table-header">
          <span className="col-rank">RANK</span>
          <span className="col-player">PILOT</span>
          <span className="col-score">SCORE</span>
          <span className="col-chain">CHAIN</span>
          <span className="col-time">{getTimeframeLabel()}</span>
        </div>

        <div className="table-body">
          {loading ? (
            <div className="loading-state">
              <div className="cyber-spinner"></div>
              <span>Loading rankings...</span>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <h3>No scores yet</h3>
              <p>Be the first to submit a score!</p>
            </div>
          ) : (
            leaderboard.map((player, index) => (
              <div 
                key={player.id || player.address}
                className={`table-row ${
                  player.address?.toLowerCase() === web3Data?.account?.toLowerCase() 
                    ? 'current-player' 
                    : ''
                } ${getRankStyle(index + 1)}`}
              >
                <span className="col-rank">
                  {index === 0 && '👑'}
                  {index === 1 && '🥈'}
                  {index === 2 && '🥉'}
                  {index > 2 && `#${index + 1}`}
                </span>
                
                <span className="col-player">
                  <div className="player-info">
                    <span className="player-name">
                      {player.name || 'Anonymous'}
                    </span>
                    <span className="player-address">
                      {formatAddress(player.address)}
                    </span>
                    {player.syncedFromChain && (
                      <span className="verified-badge" title="Verified on blockchain">✓</span>
                    )}
                  </div>
                </span>
                
                <span className="col-score cyber-text">
                  {player.score?.toLocaleString()}
                </span>
                
                <span className="col-chain">
                  <span className={`chain-badge chain-${player.chainId || 'unknown'}`}>
                    {player.chainId === 8118 ? 'SHM' : 
                     player.chainId === 8082 ? 'TEST' : '—'}
                  </span>
                </span>
                
                <span className="col-time">
                  {player.timestamp?.toDate 
                    ? player.timestamp.toDate().toLocaleDateString()
                    : dataSource === 'mock' ? 'Demo' : 'Just now'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="leaderboard-footer">
        <div className="tech-info">
          {dataSource === 'firebase' && (
            <>
              <span className="tech-badge">🔥 Firebase Realtime</span>
              <span className="tech-badge">⛓ Shardeum Blockchain</span>
            </>
          )}
          {dataSource === 'mock' && (
            <span className="tech-badge">📝 Demo Mode - Configure Firebase to enable real-time sync</span>
          )}
        </div>
        <p className="footer-note">
          {dataSource === 'firebase' 
            ? 'Scores are stored in real-time on Firebase and periodically synced to Shardeum blockchain for permanent verification.'
            : 'Add your Firebase credentials to .env to enable real-time score tracking and blockchain synchronization.'}
        </p>
      </div>
    </div>
  );
}
