// src/components/GameCanvas.jsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { GameEngine } from '../game/engine/GameLoop';
import { ScoreSubmitter } from '../game/blockchain/ScoreSubmit';
import { RewardClaimer } from '../game/blockchain/RewardClaim';
import { useGameContract } from '../hooks/useGameContract';
import { useFirebaseLeaderboard } from '../hooks/useFirebaseLeaderboard';

export default function GameCanvas({ web3Data, selectedShip }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const submitterRef = useRef(null);
  const rewarderRef = useRef(null);
  
  const [gameState, setGameState] = useState('menu'); // menu, playing, paused, gameover
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastReward, setLastReward] = useState(null);
  const [playerName, setPlayerName] = useState('');
  
  const { submitScore, getPlayerStats, getContracts } = useGameContract(
    web3Data?.signer, 
    web3Data?.chainId
  );

  const { leaderboard, submitScoreHybrid, submitScoreToFirebase } = useFirebaseLeaderboard(web3Data);

  // Initialize blockchain submitters
  useEffect(() => {
    if (web3Data?.signer && getContracts()) {
      const contracts = getContracts();
      submitterRef.current = new ScoreSubmitter(contracts.game, web3Data.signer);
      rewarderRef.current = new RewardClaimer(
        contracts.game, 
        web3Data.signer
      );
      
      // Load player stats
      loadPlayerStats();
    }
  }, [web3Data, getContracts]);

  const loadPlayerStats = async () => {
    if (!web3Data?.account) return;
    const stats = await getPlayerStats(web3Data.account);
    if (stats) {
      setHighScore(stats.highScore);
      setPlayerName(stats.playerName || '');
    }
  };

  // Initialize game engine
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    
    // Set canvas size
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      canvas.width = Math.min(800, container.clientWidth - 40);
      canvas.height = Math.min(600, window.innerHeight - 200);
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Initialize game engine
    engineRef.current = new GameEngine(canvas, {
      onScoreUpdate: (newScore) => {
        setScore(newScore);
        // Update level based on score
        const newLevel = Math.floor(newScore / 500) + 1;
        setLevel(newLevel);
      },
      onLivesUpdate: (newLives) => setLives(newLives),
      onGameOver: handleGameOver,
      onLevelUp: (newLevel) => setLevel(newLevel)
    });
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      engineRef.current?.stop();
    };
  }, []);

  const handleGameOver = useCallback(async (finalScore, finalLevel, difficulty) => {
    setGameState('gameover');
    
    // Immediately calculate and show the reward
    const diff = difficulty || 1;
    const baseReward = finalScore * 0.001;
    const levelMultiplier = 1 + (finalLevel - 1) * 0.1;
    const difficultyBonus = diff * 0.5;
    const calculatedReward = baseReward * levelMultiplier * (1 + difficultyBonus);
    
    if (finalScore > 0) {
      // Show reward immediately (before blockchain confirmation)
      setLastReward({
        amount: parseFloat(calculatedReward.toFixed(6)),
        verified: false,
        status: 'claiming'
      });
    }

    if (!web3Data?.account || finalScore <= 0) return;

    try {
      // Generate proof
      const proof = ethers.keccak256(ethers.toUtf8Bytes(
        `${web3Data.account}-${finalScore}-${Date.now()}`
      ));

      const contracts = getContracts();
      const gameContract = contracts?.game || null;

      const result = await submitScoreHybrid({
        score: finalScore,
        level: finalLevel,
        difficulty: diff,
        playerName: playerName || 'Anonymous',
        proof,
        gameContract
      });

      // Update reward with blockchain confirmation
      setLastReward({
        amount: result.amount || parseFloat(calculatedReward.toFixed(6)),
        verified: result.verified,
        txHash: result.txHash,
        status: result.verified ? 'confirmed' : 'submitted'
      });

      if (result.isNewHighScore) {
        setHighScore(finalScore);
      }
    } catch (error) {
      console.error('Score submission failed:', error);
      // Keep showing the calculated reward even if submission fails
      setLastReward({
        amount: parseFloat(calculatedReward.toFixed(6)),
        verified: false,
        status: 'pending'
      });
      // Fallback: submit to Firebase only
      try {
        await submitScoreToFirebase({
          address: web3Data.account,
          name: playerName || 'Anonymous',
          score: finalScore,
          level: finalLevel,
          difficulty: diff,
          chainId: web3Data.chainId || 8119,
          isNewHighScore: finalScore > highScore
        });
      } catch (fbErr) {
        console.error('Firebase fallback failed:', fbErr);
      }
    }
  }, [web3Data, highScore, playerName, submitScoreHybrid, submitScoreToFirebase, getContracts]);

  const startGame = () => {
    if (!engineRef.current) return;
    
    // Convert NFT ship stats to game stats
    const shipStats = selectedShip ? {
      speed: selectedShip.speed,
      health: selectedShip.health,
      fireRate: selectedShip.fireRate,
      damage: selectedShip.damage
    } : null;
    
    engineRef.current.start(shipStats);
    setGameState('playing');
    setScore(0);
    setLevel(1);
    setLives(3);
    setLastReward(null);
  };

  const pauseGame = () => {
    if (engineRef.current) {
      engineRef.current.togglePause();
      setGameState(prev => prev === 'playing' ? 'paused' : 'playing');
    }
  };

  const handleSubmitScore = async (scoreToSubmit = score) => {
    if (!playerName) {
      alert('Please enter your name first!');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const proof = ethers.keccak256(ethers.toUtf8Bytes(
        `${web3Data?.account || 'anon'}-${scoreToSubmit}-${Date.now()}`
      ));

      const contracts = getContracts();

      if (web3Data?.account && contracts?.game) {
        // Full hybrid: Firebase + blockchain
        const result = await submitScoreHybrid({
          score: scoreToSubmit,
          level,
          difficulty: 1,
          playerName,
          proof,
          gameContract: contracts.game
        });

        const messages = ['✓ Firebase'];
        if (result.verified) messages.push('⛓ Blockchain');
        alert(`Score submitted! ${messages.join(' & ')}\n\nYour score has been recorded!`);

        if (result.isNewHighScore) setHighScore(scoreToSubmit);
      } else if (web3Data?.account) {
        // Firebase only (no contract deployed yet)
        await submitScoreToFirebase({
          address: web3Data.account,
          name: playerName,
          score: scoreToSubmit,
          level,
          difficulty: 1,
          chainId: web3Data.chainId || 8119,
          isNewHighScore: scoreToSubmit > highScore
        });
        alert('Score submitted to Firebase! (Blockchain sync pending)');
        if (scoreToSubmit > highScore) setHighScore(scoreToSubmit);
      } else {
        alert('Connect wallet to save scores.');
      }

      setGameState('menu');
      setScore(0);
    } catch (error) {
      console.error('Submit error:', error);
      alert('Error submitting score. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && gameState === 'playing') {
        pauseGame();
      }
      if ((e.key === 'n' || e.key === 'N') && gameState === 'gameover') {
        startGame();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  return (
    <div className="game-canvas-container">
      {/* HUD */}
      <div className="game-hud">
        <div className="hud-left">
          <div className="stat-box">
            <span className="stat-label">SCORE</span>
            <span className="stat-value cyber-text">{score.toLocaleString()}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">HIGH SCORE</span>
            <span className="stat-value cyber-text gold">{highScore.toLocaleString()}</span>
          </div>
        </div>
        
        <div className="hud-center">
          <div className="level-indicator">
            <span className="level-label">LEVEL</span>
            <span className="level-value">{level}</span>
          </div>
        </div>
        
        <div className="hud-right">
          <div className="lives-display">
            {[...Array(3)].map((_, i) => (
              <div 
                key={i} 
                className={`life-icon ${i < lives ? 'active' : 'lost'}`}
              />
            ))}
          </div>
          {web3Data?.account && (
            <div className="wallet-badge">
              <span className="pulse-dot"></span>
              {web3Data.account.slice(0, 6)}...{web3Data.account.slice(-4)}
            </div>
          )}
        </div>
      </div>

      {/* Game Canvas */}
      <div className="canvas-wrapper">
        <canvas 
          ref={canvasRef} 
          className="game-canvas"
          tabIndex={0}
        />
        
        {/* Overlay Screens */}
        {gameState === 'menu' && (
          <div className="game-overlay menu-screen">
            <h1 className="game-title cyber-glitch">SPACE SHOOTER</h1>
            <p className="game-subtitle">Web3 Arcade on Shardeum</p>
            
            {selectedShip && (
              <div className="selected-ship-preview">
                <h3>Selected Ship: #{selectedShip.tokenId}</h3>
                <div className="ship-stats">
                  <span>SPD: {selectedShip.speed}</span>
                  <span>ATK: {selectedShip.damage}</span>
                  <span>HP: {selectedShip.health}</span>
                </div>
              </div>
            )}
            
            <div className="menu-buttons">
              <button 
                className="cyber-btn primary"
                onClick={startGame}
              >
                START MISSION
              </button>
              
              {!web3Data?.account && (
                <p className="connect-warning">
                  Connect wallet to save scores on-chain
                </p>
              )}
            </div>
            
            <div className="controls-info">
              <div className="control-item">
                <span className="key">←→</span>
                <span>MOVE</span>
              </div>
              <div className="control-item">
                <span className="key">SPACE</span>
                <span>SHOOT</span>
              </div>
              <div className="control-item">
                <span className="key">ESC</span>
                <span>PAUSE</span>
              </div>
            </div>
          </div>
        )}
        
        {gameState === 'paused' && (
          <div className="game-overlay pause-screen">
            <h2 className="pause-title">PAUSED</h2>
            <div className="pause-menu">
              <button className="cyber-btn" onClick={pauseGame}>
                RESUME
              </button>
              <button className="cyber-btn" onClick={startGame}>
                RESTART
              </button>
            </div>
          </div>
        )}
        
        {gameState === 'gameover' && (
          <div className="game-overlay gameover-screen">
            <h2 className="gameover-title">MISSION FAILED</h2>
            
            <div className="final-stats">
              <div className="final-stat">
                <span className="label">FINAL SCORE</span>
                <span className="value cyber-text">{score.toLocaleString()}</span>
              </div>
              <div className="final-stat">
                <span className="label">LEVEL REACHED</span>
                <span className="value">{level}</span>
              </div>
              {lastReward && lastReward.amount > 0 && (
                <div className="final-stat reward">
                  <span className="label">REWARD {lastReward.status === 'confirmed' ? 'CLAIMED' : lastReward.status === 'claiming' ? 'CLAIMING...' : 'EARNED'}</span>
                  <span className="value gold">+{parseFloat(lastReward.amount).toFixed(4)} SPACE</span>
                  {lastReward.status === 'confirmed' && <span className="reward-check">&#10003; On-chain</span>}
                  {lastReward.status === 'claiming' && <span className="reward-pending">&#9889; Processing</span>}
                  {lastReward.status === 'pending' && <span className="reward-pending">&#9889; Pending</span>}
                </div>
              )}
            </div>
            
            {score > highScore && web3Data?.account && (
              <div className="highscore-form">
                <p className="new-record">NEW HIGH SCORE!</p>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={20}
                  className="cyber-input"
                />
                <button 
                  className="cyber-btn primary"
                  onClick={() => handleSubmitScore()}
                  disabled={isSubmitting || !playerName}
                >
                  {isSubmitting ? 'SUBMITTING...' : 'SUBMIT TO BLOCKCHAIN'}
                </button>
              </div>
            )}

            {/* Leaderboard in Game Over */}
            <div className="gameover-leaderboard">
              <h3 className="leaderboard-title">TOP PLAYERS</h3>
              <div className="leaderboard-mini">
                {leaderboard.length > 0 ? (
                  leaderboard.slice(0, 5).map((entry, i) => (
                    <div key={entry.id || i} className={`lb-row ${entry.isCurrentPlayer ? 'current' : ''}`}>
                      <span className="lb-rank">#{i + 1}</span>
                      <span className="lb-name">{entry.name || 'Anonymous'}</span>
                      <span className="lb-score">{(entry.score || 0).toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <p className="lb-empty">No scores yet. Be the first!</p>
                )}
              </div>
            </div>
            
            <div className="gameover-actions">
              <button className="cyber-btn primary" onClick={startGame}>
                PLAY AGAIN
              </button>
              <button className="cyber-btn" onClick={() => setGameState('menu')}>
                MAIN MENU
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Info */}
      <div className="game-footer">
        <div className="ship-info">
          {selectedShip ? (
            <span>NFT Ship #{selectedShip.tokenId} Active</span>
          ) : (
            <span>Default Ship (No NFT)</span>
          )}
        </div>
        {web3Data?.account && (
          <div className="network-info">
            <span className="network-badge">Shardeum {web3Data.chainId === 8119 ? 'Testnet' : 'Unknown'}</span>
          </div>
        )}
      </div>
    </div>
  );
}