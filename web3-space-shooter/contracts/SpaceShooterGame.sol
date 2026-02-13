// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract NFTSpaceship is ERC721Enumerable {
    struct ShipAttributes {
        uint8 speed;
        uint8 fireRate;
        uint8 health;
        uint8 damage;
        string metadataURI;
    }
    
    mapping(uint256 => ShipAttributes) public shipStats;
    uint256 public nextTokenId;
    
    event ShipMinted(address owner, uint256 tokenId, string rarity);
    
    function mintShip(string memory rarity) external payable {
        require(msg.value >= 0.01 ether, "Insufficient payment");
        
        uint256 tokenId = nextTokenId++;
        _safeMint(msg.sender, tokenId);
        
        // Generate stats based on rarity
        shipStats[tokenId] = generateStats(rarity);
        emit ShipMinted(msg.sender, tokenId, rarity);
    }
    
    function generateStats(string memory rarity) internal pure returns (ShipAttributes memory) {
        // Pseudo-random stat generation
        if (keccak256(bytes(rarity)) == keccak256(bytes("legendary"))) {
            return ShipAttributes(10, 10, 10, 10, "ipfs://legendary");
        } else if (keccak256(bytes(rarity)) == keccak256(bytes("epic"))) {
            return ShipAttributes(8, 8, 8, 8, "ipfs://epic");
        } else {
            return ShipAttributes(5, 5, 5, 5, "ipfs://common");
        }
    }
}