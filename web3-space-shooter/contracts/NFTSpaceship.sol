// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SpaceShooterGame {
    struct Player {
        uint256 highScore;
        uint256 gamesPlayed;
        uint256 totalEarned;
        string playerName;
    }
    
    mapping(address => Player) public players;
    address[] public leaderboard;
    
    event NewHighScore(address player, uint256 score, uint256 timestamp);
    event GameStarted(address player, uint256 timestamp);
    
    function submitScore(uint256 score, string memory name) external {
        Player storage player = players[msg.sender];
        
        if (score > player.highScore) {
            player.highScore = score;
            player.playerName = name;
            emit NewHighScore(msg.sender, score, block.timestamp);
            
            // Update leaderboard
            updateLeaderboard(msg.sender);
        }
        
        player.gamesPlayed++;
    }
    
    function updateLeaderboard(address player) internal {
        // Simple leaderboard logic - can be optimized
        bool exists = false;
        for (uint i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i] == player) {
                exists = true;
                break;
            }
        }
        if (!exists) {
            leaderboard.push(player);
        }
    }
    
    function getTopPlayers(uint256 count) external view returns (address[] memory) {
        // Return top players sorted by score
        return leaderboard;
    }
    
    function getPlayerStats(address player) external view returns (Player memory) {
        return players[player];
    }
}