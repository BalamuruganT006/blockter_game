// src/components/Marketplace.jsx
import { useState, useEffect } from 'react';
import { useGameContract } from '../hooks/useGameContract';
import { ethers } from 'ethers';

const SHIP_TIERS = [
  { id: 'common', name: 'Scout', price: '0.01', color: '#6b7280', stats: { speed: 5, health: 5, fireRate: 5, damage: 5 } },
  { id: 'rare', name: 'Fighter', price: '0.05', color: '#3b82f6', stats: { speed: 7, health: 7, fireRate: 6, damage: 7 } },
  { id: 'epic', name: 'Destroyer', price: '0.1', color: '#a855f7', stats: { speed: 8, health: 9, fireRate: 7, damage: 8 } },
  { id: 'legendary', name: 'Titan', price: '0.5', color: '#f59e0b', stats: { speed: 10, health: 10, fireRate: 10, damage: 10 } }
];

export default function Marketplace({ web3Data, onSelectShip, selectedShip }) {
  const [ownedShips, setOwnedShips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(null);
  const [activeTab, setActiveTab] = useState('shop'); // shop, inventory
  
  const { mintNFTShip, getPlayerShips, getTokenBalance } = useGameContract(
    web3Data?.signer,
    web3Data?.chainId
  );

  useEffect(() => {
    if (web3Data?.account) {
      loadInventory();
    }
  }, [web3Data]);

  const loadInventory = async () => {
    if (!web3Data?.account) return;
    
    setLoading(true);
    try {
      const ships = await getPlayerShips(web3Data.account);
      setOwnedShips(ships);
    } catch (error) {
      console.error('Failed to load ships:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMint = async (tier) => {
    if (!web3Data?.signer) {
      alert('Please connect your wallet first');
      return;
    }

    setMinting(tier.id);
    try {
      const result = await mintNFTShip(tier.id, tier.price);
      
      if (result.success) {
        alert(`Successfully minted ${tier.name}! Token ID: ${result.tokenId}`);
        await loadInventory();
      }
    } catch (error) {
      console.error('Minting failed:', error);
      alert('Minting failed: ' + error.message);
    } finally {
      setMinting(null);
    }
  };

  const getStatBars = (stats) => {
    return (
      <div className="stat-bars">
        <div className="stat-bar">
          <span>SPD</span>
          <div className="bar"><div style={{width: `${stats.speed * 10}%`}}></div></div>
        </div>
        <div className="stat-bar">
          <span>ATK</span>
          <div className="bar"><div style={{width: `${stats.damage * 10}%`}}></div></div>
        </div>
        <div className="stat-bar">
          <span>HP</span>
          <div className="bar"><div style={{width: `${stats.health * 10}%`}}></div></div>
        </div>
        <div className="stat-bar">
          <span>FIR</span>
          <div className="bar"><div style={{width: `${stats.fireRate * 10}%`}}></div></div>
        </div>
      </div>
    );
  };

  return (
    <div className="marketplace-container">
      <div className="marketplace-header">
        <h2 className="cyber-title">SHIP MARKETPLACE</h2>
        
        <div className="marketplace-tabs">
          <button 
            className={activeTab === 'shop' ? 'active' : ''}
            onClick={() => setActiveTab('shop')}
          >
            SHOP
          </button>
          <button 
            className={activeTab === 'inventory' ? 'active' : ''}
            onClick={() => setActiveTab('inventory')}
          >
            MY HANGAR ({ownedShips.length})
          </button>
        </div>
      </div>

      {activeTab === 'shop' ? (
        <div className="shop-grid">
          {SHIP_TIERS.map((tier) => (
            <div 
              key={tier.id}
              className={`ship-card ${tier.id}`}
              style={{ '--tier-color': tier.color }}
            >
              <div className="ship-preview">
                <div className="ship-model" style={{ borderColor: tier.color }}>
                  <div className="ship-glow" style={{ background: tier.color }}></div>
                </div>
                <div className="tier-badge" style={{ background: tier.color }}>
                  {tier.id.toUpperCase()}
                </div>
              </div>
              
              <div className="ship-info">
                <h3 className="ship-name">{tier.name}</h3>
                <p className="ship-desc">Tier {tier.id} combat vessel</p>
                
                {getStatBars(tier.stats)}
                
                <div className="ship-price">
                  <span className="price-amount">{tier.price}</span>
                  <span className="price-unit">SHM</span>
                </div>
              </div>
              
              <button 
                className="mint-btn cyber-btn"
                onClick={() => handleMint(tier)}
                disabled={minting === tier.id || !web3Data?.account}
              >
                {minting === tier.id ? (
                  <>
                    <span className="spinner"></span>
                    MINTING...
                  </>
                ) : !web3Data?.account ? (
                  'CONNECT WALLET'
                ) : (
                  'MINT SHIP'
                )}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="inventory-grid">
          {loading ? (
            <div className="loading-state">
              <div className="cyber-spinner"></div>
              <span>Loading your ships...</span>
            </div>
          ) : ownedShips.length === 0 ? (
            <div className="empty-hangar">
              <div className="empty-icon">🚀</div>
              <h3>No Ships in Hangar</h3>
              <p>Visit the shop to mint your first NFT ship</p>
              <button 
                className="cyber-btn"
                onClick={() => setActiveTab('shop')}
              >
                BROWSE SHIPS
              </button>
            </div>
          ) : (
            ownedShips.map((ship) => {
              const tier = SHIP_TIERS.find(t => t.id === ship.rarity) || SHIP_TIERS[0];
              const isSelected = selectedShip?.tokenId === ship.tokenId;
              
              return (
                <div 
                  key={ship.tokenId}
                  className={`inventory-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelectShip(ship)}
                  style={{ '--tier-color': tier.color }}
                >
                  <div className="card-header">
                    <span className="token-id">#{ship.tokenId}</span>
                    <span 
                      className="rarity-badge"
                      style={{ background: tier.color }}
                    >
                      {tier.id}
                    </span>
                  </div>
                  
                  <div className="ship-preview-small">
                    <div className="ship-icon" style={{ borderColor: tier.color }}>
                      <span>{tier.name[0]}</span>
                    </div>
                  </div>
                  
                  <div className="ship-stats-compact">
                    <div className="stat" title="Speed">
                      <span>SPD</span>
                      <strong>{ship.speed}</strong>
                    </div>
                    <div className="stat" title="Damage">
                      <span>ATK</span>
                      <strong>{ship.damage}</strong>
                    </div>
                    <div className="stat" title="Health">
                      <span>HP</span>
                      <strong>{ship.health}</strong>
                    </div>
                    <div className="stat" title="Fire Rate">
                      <span>FIR</span>
                      <strong>{ship.fireRate}</strong>
                    </div>
                  </div>
                  
                  {isSelected && (
                    <div className="selected-indicator">
                      <span>✓ SELECTED</span>
                    </div>
                  )}
                  
                  <div className="card-actions">
                    <a 
                      href={`https://explorer.shardeum.org/token/${ship.tokenId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="action-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View on Explorer
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <div className="marketplace-footer">
        <div className="info-box">
          <h4>About NFT Ships</h4>
          <p>NFT ships provide permanent stat bonuses and can be traded on the marketplace. Each ship is unique and stored on the Shardeum blockchain.</p>
        </div>
      </div>
    </div>
  );
}