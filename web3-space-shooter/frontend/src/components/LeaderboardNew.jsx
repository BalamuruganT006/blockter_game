// src/components/Leaderboard.jsx
import { useState, useEffect } from 'react';
import { useFirebaseLeaderboard } from '../hooks/useFirebaseLeaderboard';
import './Leaderboard.css';

export default function Leaderboard({ web3Data, gameContract }) {
  const [timeframe, setTimeframe] = useState('all');
  const [showSyncModal, setShowSyncModal] = useState(false);
  
  const {
    leaderboard,
    playerStats,
    isLoading,
    syncStatus,
    getPlayerStats: fetchPlayerStats,
    syncFromBlockchain,
    verifyScoreOnChain
  } = useFirebaseLeaderboard(web3Data);

  // Load player stats when wallet connects
  useEffect(() => {
    if (web3Data?.account) {
      fetchPlayerStats(web3Data.account);
    }
  }, [web3Data?.account, fetchPlayerStats]);

  const handleManualSync = async () => {
    if (!gameContract) return;
    try {
      await syncFromBlockchain(gameContract, 50);
    } catch (err) {
      console.error('Sync failed:', err);
    }
    setShowSyncModal(false);
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

  const filteredLeaderboard = leaderboard.filter(entry => {
    if (timeframe === 'all') return true;
    if (!entry.timestamp?.toDate) return true;
    const entryDate = entry.timestamp.toDate();
    const now = Date.now();
    if (timeframe === 'day') return now - entryDate.getTime() < 86400000;
    if (timeframe === 'week') return now - entryDate.getTime() < 604800000;
    return true;
  });

  return (
    <div className="leaderboard-container">
      {/* Header */}
      <div className="leaderboard-header">
        <div className="title-section">
          <h2 className="cyber-title">LEADERBOARD</h2>
          <div className={`sync-indicator ${syncStatus}`}>
            {syncStatus === 'synced' && <span className="pulse-dot"></span>}
            {syncStatus === 'syncing' && <span className="spinner"></span>}
            <span>{syncStatus === 'synced' ? 'LIVE' : syncStatus === 'idle' ? 'LIVE' : syncStatus.toUpperCase()}</span>
          </div>
        </div>

        <div className="controls-section">
          <div className="timeframe-tabs">
            {['day', 'week', 'all'].map((tf) => (
              <button
                key={tf}
                className={timeframe === tf ? 'active' : ''}
                onClick={() => setTimeframe(tf)}
              >
                {tf === 'day' ? '24H' : tf === 'week' ? '7D' : 'ALL TIME'}
              </button>
            ))}
          </div>

          {web3Data?.account && (
            <button 
              className="sync-btn"
              onClick={() => setShowSyncModal(true)}
              disabled={syncStatus === 'syncing' || !gameContract}
            >
              🔄 SYNC
            </button>
          )}
        </div>
      </div>

      {/* Player Rank Banner */}
      {web3Data?.account && playerStats && (
        <div className="player-rank-banner">
          <div className="rank-info">
            <span className="rank-label">YOUR BEST</span>
            <span className="rank-score">{playerStats.score?.toLocaleString() || playerStats.lastScore?.toLocaleString() || 0}</span>
          </div>
          <div className="rank-meta">
            <span>Games: {playerStats.gamesPlayed || 0}</span>
            {playerStats.txHash && (
              <a 
                href={`https://explorer-mezame.shardeum.org/tx/${playerStats.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="verified-link"
              >
                ✓ Verified
              </a>
            )}
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="leaderboard-stats">
        <div className="stat-pill">
          <span className="stat-value">{leaderboard.length}</span>
          <span className="stat-label">PILOTS</span>
        </div>
        <div className="stat-pill">
          <span className="stat-value">
            {leaderboard[0]?.score?.toLocaleString() || '-'}
          </span>
          <span className="stat-label">TOP SCORE</span>
        </div>
        <div className="stat-pill">
          <span className="stat-value">
            {leaderboard.filter(e => e.verified).length}
          </span>
          <span className="stat-label">VERIFIED</span>
        </div>
      </div>

      {/* Table */}
      <div className="leaderboard-table">
        <div className="table-header">
          <span className="col-rank">RANK</span>
          <span className="col-player">PILOT</span>
          <span className="col-score">SCORE</span>
          <span className="col-level">LVL</span>
          <span className="col-status">STATUS</span>
        </div>

        <div className="table-body">
          {isLoading && leaderboard.length === 0 ? (
            <div className="loading-state">
              <div className="cyber-spinner"></div>
              <span>Loading rankings...</span>
            </div>
          ) : filteredLeaderboard.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏆</div>
              <h3>No scores recorded</h3>
              <p>Be the first to submit a score!</p>
            </div>
          ) : (
            filteredLeaderboard.map((player) => (
              <div
                key={player.id}
                className={`table-row ${player.isCurrentPlayer ? 'current-player' : ''} ${getRankStyle(player.rank)}`}
              >
                <span className="col-rank">
                  {player.rank <= 3 ? ['👑', '🥈', '🥉'][player.rank - 1] : `#${player.rank}`}
                </span>

                <span className="col-player">
                  <div className="player-info">
                    <span className="player-name">{player.name || 'Anonymous'}</span>
                    <span className="player-address">{formatAddress(player.address)}</span>
                    {player.isCurrentPlayer && <span className="you-badge">YOU</span>}
                  </div>
                </span>

                <span className="col-score cyber-text">
                  {player.score?.toLocaleString()}
                </span>

                <span className="col-level">
                  {player.level || '-'}
                </span>

                <span className="col-status">
                  {player.verified ? (
                    <a
                      className="status-badge verified"
                      href={`https://explorer-mezame.shardeum.org/tx/${player.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Verified on Shardeum — click to view tx"
                    >
                      ⛓ Verified
                    </a>
                  ) : player.txHash ? (
                    <span className="status-badge pending" title="Blockchain confirmation in progress">
                      🔄 Confirming
                    </span>
                  ) : (
                    <span className="status-badge saved" title="Saved to Firebase — awaiting blockchain sync">
                      ✓ Saved
                    </span>
                  )}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="leaderboard-footer">
        <div className="tech-badges">
          <span className="tech-badge">🔥 Firebase Realtime</span>
          <span className="tech-badge">⛓ Shardeum Blockchain</span>
        </div>
        <p className="sync-note">
          Scores appear instantly via Firebase. Blockchain verification confirms permanence.
        </p>
      </div>

      {/* Sync Modal */}
      {showSyncModal && (
        <div className="modal-overlay" onClick={() => setShowSyncModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Sync from Blockchain</h3>
            <p>This will fetch the latest verified scores from Shardeum blockchain and update Firebase.</p>
            <div className="modal-actions">
              <button 
                className="cyber-btn primary"
                onClick={handleManualSync}
                disabled={syncStatus === 'syncing'}
              >
                {syncStatus === 'syncing' ? 'SYNCING...' : 'CONFIRM SYNC'}
              </button>
              <button 
                className="cyber-btn"
                onClick={() => setShowSyncModal(false)}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
