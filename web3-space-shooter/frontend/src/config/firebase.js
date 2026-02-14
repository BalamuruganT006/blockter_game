// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { 
  getFirestore, 
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
  runTransaction
} from 'firebase/firestore';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAHy5dW9Xz-Od0nnAwUXG074qYdSqAuW4U",
  authDomain: "blocktergame.firebaseapp.com",
  projectId: "blocktergame",
  storageBucket: "blocktergame.firebasestorage.app",
  messagingSenderId: "28370993719",
  appId: "1:28370993719:web:becbb8517a895f4b0275b2",
  measurementId: "G-RLX4H528YR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (only in production/browser environment)
let analytics = null;
try {
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
  }
} catch (error) {
  console.warn('Analytics initialization failed:', error.message);
}

const db = getFirestore(app);

// Test Firebase connection
console.log('🔥 Firebase initialized with config:');
console.log('  Project ID:', firebaseConfig.projectId);
console.log('  Auth Domain:', firebaseConfig.authDomain);
console.log('  Firestore initialized:', !!db);
console.log('');
console.log('⚠️ If you see errors about Firestore:');
console.log('  1. Go to https://console.firebase.google.com/project/blocktergame/firestore');
console.log('  2. Click "Create Database"');
console.log('  3. Choose "Start in test mode" (30 days)');
console.log('  4. Select your region (e.g., us-central)');
console.log('  5. Click "Enable"');
console.log('');

// Collection references
const LEADERBOARD_COLLECTION = 'leaderboard';
const PLAYERS_COLLECTION = 'players';
const SYNC_LOG_COLLECTION = 'syncLogs';

export {
  app,
  analytics,
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
  runTransaction,
  LEADERBOARD_COLLECTION,
  PLAYERS_COLLECTION,
  SYNC_LOG_COLLECTION
};
