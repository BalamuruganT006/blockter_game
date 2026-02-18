// src/hooks/useWeb3.js
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../contracts/addresses';

const SHARDEUM_TESTNET = {
  chainId: '0x1FB7', // 8119 in hex
  chainName: 'Shardeum EVM Testnet',
  rpcUrls: ['https://api-mezame.shardeum.org'],
  blockExplorerUrls: ['https://explorer-mezame.shardeum.org'],
  nativeCurrency: {
    name: 'Shardeum',
    symbol: 'SHM',
    decimals: 18
  }
};

export const useWeb3 = () => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const checkIfWalletIsInstalled = () => {
    return typeof window !== 'undefined' && window.ethereum;
  };

  const switchToShardeum = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SHARDEUM_TESTNET.chainId }]
      });
    } catch (switchError) {
      // Chain not added, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [SHARDEUM_TESTNET]
          });
        } catch (addError) {
          throw new Error('Failed to add Shardeum network');
        }
      }
    }
  };

  const connectWallet = useCallback(async () => {
    if (!checkIfWalletIsInstalled()) {
      setError('MetaMask not installed');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      // Switch to Shardeum
      await switchToShardeum();

      // Create provider and signer
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const newSigner = await browserProvider.getSigner();
      const network = await browserProvider.getNetwork();

      setProvider(browserProvider);
      setSigner(newSigner);
      setAccount(accounts[0]);
      setChainId(Number(network.chainId));

      // Prompt user to add SPACE token to MetaMask
      const spaceTokenAddress = CONTRACT_ADDRESSES[Number(network.chainId)]?.SpaceToken;
      if (spaceTokenAddress) {
        try {
          await window.ethereum.request({
            method: 'wallet_watchAsset',
            params: {
              type: 'ERC20',
              options: {
                address: spaceTokenAddress,
                symbol: 'SPACE',
                decimals: 18,
              },
            },
          });
        } catch (tokenErr) {
          console.warn('User declined adding SPACE token:', tokenErr);
        }
      }

      // Listen for account changes
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('disconnect', handleDisconnect);

    } catch (err) {
      setError(err.message || 'Failed to connect wallet');
      console.error('Wallet connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setChainId(null);
    
    if (window.ethereum) {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
      window.ethereum.removeListener('disconnect', handleDisconnect);
    }
  }, []);

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      setAccount(accounts[0]);
    }
  };

  const handleChainChanged = () => {
    window.location.reload();
  };

  const handleDisconnect = () => {
    disconnectWallet();
  };

  const getBalance = useCallback(async () => {
    if (!provider || !account) return null;
    try {
      const balance = await provider.getBalance(account);
      return ethers.formatEther(balance);
    } catch (err) {
      console.error('Failed to get balance:', err);
      return null;
    }
  }, [provider, account]);

  const isCorrectNetwork = () => {
    return chainId === 8119; // Shardeum EVM Testnet (Mezame)
  };

  return {
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
    isInstalled: checkIfWalletIsInstalled()
  };
};