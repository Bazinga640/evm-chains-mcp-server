// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MintableNFT
 * @dev ERC721 NFT with URI storage and owner-controlled minting
 *
 * Features:
 * - Owner can mint NFTs with custom URIs
 * - Each token has individual metadata URI
 * - Standard ERC721 transfer and approval functions
 * - Based on OpenZeppelin v5.1.0 (October 2025)
 */
contract MintableNFT is ERC721URIStorage, Ownable {

    /**
     * @dev Constructor sets collection name, symbol, and deployer as owner
     * @param name_ Collection name (e.g., "My NFT Collection")
     * @param symbol_ Collection symbol (e.g., "MNFT")
     */
    constructor(
        string memory name_,
        string memory symbol_
    ) ERC721(name_, symbol_) Ownable(msg.sender) {}

    /**
     * @dev Mint new NFT with metadata URI
     * @param to Recipient address
     * @param tokenId Unique token ID
     * @param uri Metadata URI (IPFS, HTTP, or on-chain)
     *
     * Requirements:
     * - Only owner can mint
     * - tokenId must not already exist
     * - to cannot be zero address
     */
    function mint(
        address to,
        uint256 tokenId,
        string memory uri
    ) public onlyOwner {
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    /**
     * @dev Mint new NFT without URI (can be set later)
     * @param to Recipient address
     * @param tokenId Unique token ID
     *
     * Requirements:
     * - Only owner can mint
     * - tokenId must not already exist
     */
    function mint(address to, uint256 tokenId) public onlyOwner {
        _safeMint(to, tokenId);
    }
}
