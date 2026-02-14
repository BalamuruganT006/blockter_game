// src/App.jsx
import { useState, useEffect } from 'react';
import WalletConnect from './components/WalletConnect';
import GameCanvas from './components/GameCanvas';
import Leaderboard from './components/LeaderboardNew';
import Marketplace from './components/Marketplace';
import LandingPage from './components/LandingPage';
import { useGameContract } from './hooks/useGameContract';
import './styles/global.css';

function App() {
  const [showGame, setShowGame] = useState(false);
  const [web3Data, setWeb3Data] = useState(null);
  const [selectedShip, setSelectedShip] = useState(null);
  const [activeTab, setActiveTab] = useState('play');
  const [isLoading, setIsLoading] = useState(true);

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleConnect = (data) => {
    setWeb3Data(data);
    if (data?.account) {
      console.log('Connected:', data.account);
    }
  };

  const handleEnterGame = () => {
    setShowGame(true);
    window.scrollTo(0, 0);
  };

  const handleBackToLanding = () => {
    setShowGame(false);
  };

  // Get game contract instance for leaderboard sync
  const { getContracts } = useGameContract(web3Data?.signer, web3Data?.chainId);
  const contracts = web3Data?.signer ? getContracts() : null;
  const gameContract = contracts?.game || null;

  const handleSelectShip = (ship) => {
    setSelectedShip(ship);
    setActiveTab('play');
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="cyber-spinner large"></div>
        <h2 className="loading-text">INITIALIZING SYSTEM...</h2>
        <div className="loading-bar">
          <div className="loading-progress"></div>
        </div>
      </div>
    );
  }

  // Show landing page when not in game mode
  if (!showGame) {
    return <LandingPage onEnterGame={handleEnterGame} />;
  }

  return (
    <div className="app scanlines">
      <header className="app-header">
        <div className="logo">
          <button className="back-btn" onClick={handleBackToLanding} style={{
            padding: '0.5rem 1rem',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff',
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '0.8rem',
            cursor: 'pointer',
            borderRadius: '6px',
            marginRight: '1rem'
          }}>
            ← HOME
          </button>
          <span className="logo-icon">🚀</span>
          <div className="logo-text">
            <h1>SPACE SHOOTER</h1>
            <span className="subtitle">WEB3 ARCADE</span>
          </div>
          <span className="web3-badge">BETA</span>
        </div>
        <WalletConnect onConnect={handleConnect} />
      </header>

      <nav className="app-nav">
        <button 
          className={activeTab === 'play' ? 'active' : ''}
          onClick={() => setActiveTab('play')}
        >
          <span className="nav-icon">🎮</span>
          PLAY
        </button>
        <button 
          className={activeTab === 'leaderboard' ? 'active' : ''}
          onClick={() => setActiveTab('leaderboard')}
        >
          <span className="nav-icon">🏆</span>
          LEADERBOARD
        </button>
        <button 
          className={activeTab === 'marketplace' ? 'active' : ''}
          onClick={() => setActiveTab('marketplace')}
        >
          <span className="nav-icon">🛒</span>
          MARKETPLACE
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'play' && (
          <GameCanvas 
            web3Data={web3Data} 
            selectedShip={selectedShip}
          />
        )}
        
        {activeTab === 'leaderboard' && (
          <Leaderboard web3Data={web3Data} gameContract={gameContract} />
        )}
        
        {activeTab === 'marketplace' && (
          <Marketplace 
            web3Data={web3Data}
            selectedShip={selectedShip}
            onSelectShip={handleSelectShip}
          />
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p className="powered-by">
            <span className="pulse-dot"></span>
            Powered by Shardeum Blockchain
          </p>
          <div className="footer-links">
            <a href="https://docs.shardeum.org" target="_blank" rel="noopener noreferrer">
              Documentation
            </a>
            <a href="https://explorer-mezame.shardeum.org" target="_blank" rel="noopener noreferrer">
              Explorer
            </a>
            <a href="https://faucet-mezame.shardeum.org" target="_blank" rel="noopener noreferrer">
              Faucet
            </a>
          </div>
        </div>
        <p className="copyright">
          © 2024 Space Shooter Web3. All systems operational.
        </p>
      </footer>
    </div>
  );
}

export default App;