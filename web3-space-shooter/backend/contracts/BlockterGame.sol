// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/*
============================================================
FULL SPACE GAME ECOSYSTEM - REMIX READY
Deploy using Injected Provider - MetaMask
============================================================
*/

import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.6/contracts/token/ERC20/ERC20.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.6/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.6/contracts/token/ERC721/ERC721.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.6/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.6/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.6/contracts/security/Pausable.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.6/contracts/access/Ownable.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.6/contracts/security/ReentrancyGuard.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.6/contracts/utils/Counters.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.6/contracts/token/ERC20/IERC20.sol";

////////////////////////////////////////////////////////////
// SPACE TOKEN (ERC20)
////////////////////////////////////////////////////////////

contract SpaceToken is ERC20, ERC20Burnable, Pausable, Ownable {

    uint256 public constant INITIAL_SUPPLY = 10_000_000 * 1e18;
    uint256 public constant MAX_SUPPLY = 100_000_000 * 1e18;

    address public gameContract;

    modifier onlyGame() {
        require(msg.sender == gameContract, "Not game contract");
        _;
    }

    constructor(address walletAddress)
        ERC20("SpaceToken", "SPACE")
    {
        require(walletAddress != address(0), "Invalid wallet");
        _mint(walletAddress, INITIAL_SUPPLY);
    }

    function setGameContract(address _game) external onlyOwner {
        require(_game != address(0), "Invalid address");
        gameContract = _game;
    }

    function rewardPlayer(
        address player,
        uint256 amount
    ) external onlyGame whenNotPaused {

        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply reached");
        _mint(player, amount);
    }

    function rescueERC20(address token, uint256 amount)
        external onlyOwner
    {
        IERC20(token).transfer(owner(), amount);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal override whenNotPaused
    {
        super._beforeTokenTransfer(from, to, amount);
    }
}

////////////////////////////////////////////////////////////
// SPACE SHOOTER GAME
////////////////////////////////////////////////////////////

contract SpaceShooterGame is ReentrancyGuard {

    SpaceToken public token;
    address public owner;

    uint256 public constant MIN_SCORE = 100;
    uint256 public constant SUBMISSION_FEE = 0.001 ether;

    mapping(address => uint256) public highScores;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address tokenAddress) {
        token = SpaceToken(tokenAddress);
        owner = msg.sender;
    }

    function submitScore(uint256 score)
        external payable nonReentrant
    {
        require(score >= MIN_SCORE, "Low score");
        require(msg.value >= SUBMISSION_FEE, "Fee required");

        if (score > highScores[msg.sender]) {
            highScores[msg.sender] = score;

            uint256 rewardAmount = score * 1e15;
            token.rewardPlayer(msg.sender, rewardAmount);
        }

        if (msg.value > SUBMISSION_FEE) {
            payable(msg.sender).transfer(msg.value - SUBMISSION_FEE);
        }
    }

    function withdrawFees() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}

////////////////////////////////////////////////////////////
// NFT SPACESHIP
////////////////////////////////////////////////////////////

contract NFTSpaceship is
    ERC721,
    ERC721Enumerable,
    ERC721URIStorage,
    Pausable,
    Ownable
{
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    uint256 public constant PRICE = 0.01 ether;
    uint256 public constant MAX_SUPPLY = 10000;

    constructor() ERC721("SpaceShip NFT", "SHIP") {}

    function mint() external payable whenNotPaused {
        require(totalSupply() < MAX_SUPPLY, "Max supply");
        require(msg.value >= PRICE, "Not enough ETH");

        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();

        _safeMint(msg.sender, tokenId);
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    )
        internal override(ERC721, ERC721Enumerable)
        whenNotPaused
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId)
        internal override(ERC721, ERC721URIStorage)
    {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public view override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
