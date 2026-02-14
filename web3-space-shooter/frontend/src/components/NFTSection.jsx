// src/components/NFTSection.jsx
import { useState } from 'react';

const ships = [
  {
    id: 1,
    name: 'SCOUT',
    rarity: 'common',
    stats: { speed: 5, attack: 4, defense: 3 },
    price: '0.01',
    color: '#6b7280',
    image: '/images/ships/scout-ufo.png'
  },
  {
    id: 2,
    name: 'VIPER',
    rarity: 'rare',
    stats: { speed: 7, attack: 6, defense: 5 },
    price: '0.05',
    color: '#3b82f6',
    image: '/images/ships/viper-rocket.png'
  },
  {
    id: 3,
    name: 'DESTROYER',
    rarity: 'epic',
    stats: { speed: 8, attack: 9, defense: 7 },
    price: '0.1',
    color: '#a855f7',
    image: '/images/ships/destroyer-satellite.png'
  },
  {
    id: 4,
    name: 'TITAN',
    rarity: 'legendary',
    stats: { speed: 10, attack: 10, defense: 10 },
    price: '0.5',
    color: '#f59e0b',
    image: '/images/ships/titan-invader.png'
  }
];

export default function NFTSection({ isAuthenticated, onOpenAuth }) {
  const [activeShip, setActiveShip] = useState(ships[1]);
  const [isMinting, setIsMinting] = useState(false);

  const handleMint = async () => {
    if (!isAuthenticated) {
      onOpenAuth?.();
      return;
    }
    setIsMinting(true);
    await new Promise(r => setTimeout(r, 2000));
    setIsMinting(false);
    alert(`Minted ${activeShip.name} successfully!`);
  };

  return (
    <section id="nft" className="nft-section">
      <div className="nft-container">
        <div className="section-header centered">
          <span className="section-tag">COLLECT</span>
          <h2 className="section-title">
            NFT <span className="gradient">STARSHIPS</span>
          </h2>
          <p className="section-subtitle">
            Each ship is a unique NFT with real in-game stats. 
            Trade, upgrade, or stake for passive rewards.
          </p>
        </div>

        <div className="nft-showcase">
          {/* Ship Selector */}
          <div className="ship-selector">
            {ships.map((ship) => (
              <button
                key={ship.id}
                className={`ship-tab ${activeShip.id === ship.id ? 'active' : ''}`}
                onClick={() => setActiveShip(ship)}
                style={{ '--ship-color': ship.color }}
              >
                <span className="tab-rarity">{ship.rarity}</span>
                <span className="tab-name">{ship.name}</span>
              </button>
            ))}
          </div>

          {/* Active Ship Display */}
          <div className="ship-display" style={{ '--ship-color': activeShip.color }}>
            <div className="ship-visual">
              <div className="ship-glow" style={{ background: activeShip.color }}></div>
              <img className="ship-model" src={activeShip.image} alt={activeShip.name} />
              <div className="ship-orbit"></div>
            </div>

            <div className="ship-info">
              <div className="info-header">
                <h3 className="ship-name">{activeShip.name}</h3>
                <span 
                  className="ship-badge"
                  style={{ background: activeShip.color }}
                >
                  {activeShip.rarity.toUpperCase()}
                </span>
              </div>

              <div className="ship-stats">
                {Object.entries(activeShip.stats).map(([stat, value]) => (
                  <div key={stat} className="stat-bar">
                    <span className="stat-label">{stat}</span>
                    <div className="stat-track">
                      <div 
                        className="stat-fill"
                        style={{ 
                          width: `${value * 10}%`,
                          background: activeShip.color 
                        }}
                      ></div>
                    </div>
                    <span className="stat-value">{value}/10</span>
                  </div>
                ))}
              </div>

              <div className="ship-price">
                <span className="price-label">PRICE</span>
                <span className="price-amount">{activeShip.price} SHM</span>
              </div>

              <button 
                className="btn-mint"
                onClick={handleMint}
                disabled={isMinting}
                style={{ 
                  background: `linear-gradient(135deg, ${activeShip.color}, ${activeShip.color}88)` 
                }}
              >
                {isMinting ? (
                  <>
                    <span className="spinner"></span>
                    MINTING...
                  </>
                ) : (
                  'MINT SHIP'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Supply Info */}
        <div className="supply-info">
          <div className="supply-item">
            <span className="supply-label">Total Supply</span>
            <span className="supply-value">10,000</span>
          </div>
          <div className="supply-item">
            <span className="supply-label">Minted</span>
            <span className="supply-value">2,847</span>
          </div>
          <div className="supply-item">
            <span className="supply-label">Floor Price</span>
            <span className="supply-value">0.008 SHM</span>
          </div>
        </div>
      </div>
    </section>
  );
}
