// src/components/WalletConnect.jsx
import { useState, useEffect } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { useGameContract } from '../hooks/useGameContract';
import { OWNER_ADDRESS } from '../contracts/addresses';

export default function WalletConnect({ onConnect }) {
  const {
    provider,
    signer,
    account,
    chainId,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    getBalance,
    isCorrectNetwork,
    isInstalled
  } = useWeb3();

  const [balance, setBalance] = useState('0');
  const [spaceBalance, setSpaceBalance] = useState('0');
  const [showDropdown, setShowDropdown] = useState(false);
  const [setupStatus, setSetupStatus] = useState(null); // null, 'checking', 'ok', 'needed', 'setting'

  const { getTokenBalance, setupGameContract, checkGameSetup } = useGameContract(signer, chainId);

  // Update parent when connected
  useEffect(() => {
    if (account && signer) {
      onConnect({ provider, signer, account, chainId });
      updateBalance();
      updateSpaceBalance();
      runSetupCheck();
    } else {
      onConnect(null);
    }
  }, [account, signer, chainId]);

  const updateBalance = async () => {
    const bal = await getBalance();
    if (bal) setBalance(parseFloat(bal).toFixed(4));
  };

  const updateSpaceBalance = async () => {
    if (!account) return;
    try {
      const bal = await getTokenBalance(account);
      setSpaceBalance(parseFloat(bal).toFixed(2));
    } catch (err) {
      console.warn('Could not fetch SPACE balance:', err);
    }
  };

  const runSetupCheck = async () => {
    if (!account) return;
    setSetupStatus('checking');
    try {
      const result = await checkGameSetup();
      if (result?.configured) {
        setSetupStatus('ok');
      } else {
        setSetupStatus('needed');
        console.warn('Game setup needed:', result?.reason);
      }
    } catch (err) {
      setSetupStatus('needed');
    }
  };

  const handleSetupGame = async () => {
    setSetupStatus('setting');
    try {
      const result = await setupGameContract();
      if (result.success) {
        setSetupStatus('ok');
        alert(result.alreadySet
          ? 'Game contract is already linked!'
          : `Game contract linked! TX: ${result.txHash}`);
      }
    } catch (err) {
      setSetupStatus('needed');
      alert('Failed to link game contract: ' + (err.reason || err.message));
    }
  };

  const handleConnect = async () => {
    await connectWallet();
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setShowDropdown(false);
  };

  const switchNetwork = async () => {
    if (!window.ethereum) return;
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x1FB7' }] // Shardeum EVM Testnet (Mezame)
      });
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };

  if (!isInstalled) {
    return (
      <div className="wallet-connect">
        <a 
          href="https://metamask.io/download/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="install-btn"
        >
          INSTALL METAMASK
        </a>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="wallet-connect">
        <button 
          onClick={handleConnect}
          disabled={isConnecting}
          className="connect-btn cyber-btn"
        >
          {isConnecting ? (
            <>
              <span className="spinner"></span>
              CONNECTING...
            </>
          ) : (
            'CONNECT WALLET'
          )}
        </button>
        {error && <span className="error-text">{error}</span>}
      </div>
    );
  }

  return (
    <div className="wallet-connected">
      <div 
        className="wallet-badge"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <div className="wallet-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 7h-2V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-2h2c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-2 10H5V5h14v2H9c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h9v2zm2-4h-9V9h9v4z"/>
          </svg>
        </div>
        
        <div className="wallet-info">
          <span className="wallet-address">
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>
          <span className="wallet-balance">{balance} SHM</span>
          <span className="wallet-balance space-balance">{spaceBalance} SPACE</span>
        </div>
        
        <div className={`dropdown-arrow ${showDropdown ? 'open' : ''}`}>▼</div>
        
        {!isCorrectNetwork() && (
          <span className="network-warning" title="Wrong network">!</span>
        )}
      </div>

      {showDropdown && (
        <div className="wallet-dropdown">
          <div className="dropdown-header">
            <span className="network-status">
              <span className={`status-dot ${isCorrectNetwork() ? 'green' : 'red'}`}></span>
              {chainId === 8119 ? 'Shardeum EVM Testnet' : 'Unknown Network'}
            </span>
          </div>
          
          {!isCorrectNetwork() && (
            <button className="dropdown-item warning" onClick={switchNetwork}>
              Switch to Shardeum
            </button>
          )}
          
          <button className="dropdown-item" onClick={() => { updateBalance(); updateSpaceBalance(); }}>
            Refresh Balance
          </button>
          
          {/* Show setup button only for contract owner when setup is needed */}
          {setupStatus === 'needed' && account?.toLowerCase() === OWNER_ADDRESS.toLowerCase() && (
            <button className="dropdown-item warning" onClick={handleSetupGame}>
              ⚠️ Link SPACE Token to Game
            </button>
          )}
          {setupStatus === 'setting' && (
            <span className="dropdown-item">Setting up...</span>
          )}
          
          <a 
            className="dropdown-item"
            href={`https://explorer-mezame.shardeum.org/address/${account}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Explorer
          </a>
          
          <hr className="dropdown-divider" />
          
          <button className="dropdown-item disconnect" onClick={handleDisconnect}>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}