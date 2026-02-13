// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SpaceToken is ERC20, Ownable {
    mapping(address => uint256) public playerRewards;
    
    event RewardEarned(address player, uint256 amount, uint256 score);
    
    constructor() ERC20("SpaceToken", "SPACE") {
        _mint(msg.sender, 1000000 * 10**decimals());
    }
    
    function rewardPlayer(address player, uint256 score) external onlyOwner {
        uint256 rewardAmount = calculateReward(score);
        playerRewards[player] += rewardAmount;
        _transfer(owner(), player, rewardAmount);
        emit RewardEarned(player, rewardAmount, score);
    }
    
    function calculateReward(uint256 score) internal pure returns (uint256) {
        return score * 10**15; // 0.001 TOKEN per point
    }
}