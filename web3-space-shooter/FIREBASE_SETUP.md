# Firebase Integration Setup Guide

This guide explains how to set up Firebase for real-time leaderboard functionality in the Web3 Space Shooter game.

⚠️ **IMPORTANT**: If the leaderboard shows "Loading rankings..." or the submit button isn't working, you need to create a Firestore database first (see Quick Start below).

## Quick Start

**If Firebase is not connecting, follow these 3 steps:**

1. Go to [Firebase Console - Firestore](https://console.firebase.google.com/project/blocktergame/firestore)
2. Click **"Create Database"** → Select **"Start in test mode"** → Choose region → Click **"Enable"**
3. Go to [Firestore Rules](https://console.firebase.google.com/project/blocktergame/firestore/rules) and paste the rules from `firestore.rules` file → Click **"Publish"**

**After creating the database:**
- 🟢 Leaderboard will load with demo data within 3 seconds
- 🟢 Submit button will work and save scores to Firebase
- 🟢 Real-time updates will appear on the leaderboard

## Overview

The game uses a **hybrid leaderboard system**:
- **Firebase Firestore**: Real-time score updates (fast, instant feedback)
- **Shardeum Blockchain**: Permanent, tamper-proof score verification
- **Automatic Sync**: Firebase scores can be periodically synced to blockchain

## Features

✅ **Real-time Updates**: Scores appear instantly on the leaderboard  
✅ **Offline Capability**: Works without wallet connection  
✅ **Dual Storage**: Firebase for speed, blockchain for permanence  
✅ **Timeframe Filtering**: View scores from today, this week, or all time  
✅ **Verified Badges**: Shows which scores are blockchain-verified  
✅ **No Gas Fees**: Firebase submissions are free and instant  

## Setup Instructions

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Name your project (e.g., "web3-space-shooter")
4. Disable Google Analytics (optional for this project)
5. Click **"Create project"**

### 2. Enable Firestore Database

1. In your Firebase project, go to **"Build" → "Firestore Database"**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (we'll add security rules later)
4. Select a location close to your users
5. Click **"Enable"**

### 3. Get Firebase Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll to **"Your apps"** section
3. Click the **web icon** (`</>`) to register a web app
4. Name your app (e.g., "Web3 Space Shooter")
5. Copy the `firebaseConfig` object

### 4. Configure Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
```

**⚠️ Important**: Add `.env` to your `.gitignore` file!

### 5. Update Security Rules

1. Go to **Firestore Database → Rules**
2. Replace the default rules with the contents of `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Leaderboard - public read, write with validation
    match /leaderboard/{address} {
      allow read: if true;
      allow write: if request.resource.data.score >= 0
        && request.resource.data.score <= 999999999;
    }
    
    // Player profiles - public read, write allowed
    match /players/{address} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

3. Click **"Publish"**

### 6. Verify Installation

1. Restart your dev server: `npm run dev`
2. Play a game and submit a score
3. Check Firebase Console → Firestore Database
4. You should see new documents in the `leaderboard` and `players` collections

## Data Structure

### Leaderboard Collection
```javascript
{
  address: "0xabc...",           // Player's wallet address
  name: "PlayerName",             // Player's chosen name
  score: 5420,                    // High score
  chainId: 8118,                  // Shardeum mainnet/testnet
  txHash: "0x123...",             // Blockchain transaction hash (optional)
  timestamp: Timestamp,           // When score was submitted
  updatedAt: Timestamp,           // Last update time
  syncedFromChain: true           // Whether verified on blockchain
}
```

### Players Collection
```javascript
{
  address: "0xabc...",
  name: "PlayerName",
  score: 5420,
  totalGames: 42,                 // Total games played
  lastPlayed: Timestamp,
  chainId: 8118,
  txHash: "0x123...",
  timestamp: Timestamp,
  updatedAt: Timestamp
}
```

## Usage

### Submit Score to Firebase

The game automatically submits scores to Firebase when a game ends:

```javascript
// In GameCanvas.jsx
const { submitScoreToFirebase } = useFirebase();

await submitScoreToFirebase(
  playerAddress,    // 0xabc...
  playerName,       // "CyberNinja"
  score,            // 5420
  chainId,          // 8118
  txHash            // "0x123..." (optional)
);
```

### Real-time Leaderboard Subscription

The leaderboard automatically subscribes to Firebase updates:

```javascript
const { subscribeToLeaderboard } = useFirebase();

const unsubscribe = subscribeToLeaderboard(
  'all',           // timeframe: 'day', 'week', 'all'
  50,              // maxResults
  (data) => {      // callback with updated data
    setLeaderboard(data);
  }
);
```

### Sync Blockchain to Firebase

Manual sync (admin feature):

```javascript
const { syncBlockchainToFirebase } = useFirebase();

const blockchainScores = await getTopPlayersFromChain(20);
await syncBlockchainToFirebase(blockchainScores);
```

## Testing Without Firebase

The game includes **demo mode** with mock data:
- If Firebase credentials are not configured
- Or if Firebase is unreachable
- The leaderboard displays mock data automatically
- A notice appears: "📝 Demo Mode"

To test Firebase integration:
1. Configure `.env` with real Firebase credentials
2. Play a game and submit a score
3. The sync badge should show "⚡ Live"
4. Check Firebase Console to verify data

## Troubleshooting

### "Firebase not configured" error
- Check that `.env` file exists and has all required variables
- Verify variable names start with `VITE_`
- Restart dev server after changing `.env`

### Scores not appearing in Firebase
- Check browser console for errors
- Verify Firestore rules allow writes
- Ensure Firebase project is active (not suspended)
- Check that `firebase` package is installed: `npm list firebase`

### Real-time updates not working
- Verify you have an active internet connection
- Check Firebase Console → Usage tab for quota limits
- Clear browser cache and reload

### Security Rules Denied
- Update Firestore rules in Firebase Console
- Ensure the player address matches the document ID
- Check that score values are within valid range (0-999999999)

## Cost Considerations

Firebase offers a generous free tier:
- **50,000 reads/day** (free)
- **20,000 writes/day** (free)
- **20,000 deletes/day** (free)
- **1GB storage** (free)

For a small to medium player base (< 1000 daily active users), the free tier should be sufficient.

## Security Best Practices

1. **Never commit `.env` file** to version control
2. **Enable App Check** for production (prevents API abuse)
3. **Set up Cloud Functions** for sensitive operations
4. **Monitor Firebase Usage** dashboard regularly
5. **Implement rate limiting** to prevent spam
6. **Validate all data** on the client and server

## Advanced Features

### Automatic Blockchain Sync
Set up a scheduled Cloud Function to periodically sync Firebase → Blockchain:

```javascript
// functions/index.js
exports.syncToBlockchain = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    // Get top 100 scores from Firebase
    // Submit to smart contract
    // Mark as synced
  });
```

### Real-time Notifications
Subscribe to score changes for specific players:

```javascript
const playerRef = doc(db, 'players', playerAddress);
onSnapshot(playerRef, (snapshot) => {
  const data = snapshot.data();
  console.log('Player updated:', data);
});
```

## Support

For issues or questions:
- Check [Firebase Documentation](https://firebase.google.com/docs/firestore)
- Review game logs in browser console
- Check Firebase Console → Logs for backend errors

## License

This Firebase integration is part of the Web3 Space Shooter project.
