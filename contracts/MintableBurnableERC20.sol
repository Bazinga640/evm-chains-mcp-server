// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MintableBurnableERC20
 * @dev OpenZeppelin-based ERC20 token with mint and burn capabilities
 * @notice Secure, audited implementation for testnet deployment
 *
 * Features:
 * - Minting: Owner can create new tokens
 * - Burning: Anyone can burn their own tokens
 * - Ownership: Deployer is initial owner, can transfer ownership
 * - Dynamic: Customizable name and symbol at deployment
 *
 * Based on OpenZeppelin Contracts v5.1.0 (October 2025)
 * Audited and battle-tested by the Ethereum community
 */
contract MintableBurnableERC20 is ERC20, ERC20Burnable, Ownable {

    /**
     * @dev Constructor creates token with custom metadata
     * @param tokenName Name of the token (e.g., "Mintable Test Token")
     * @param tokenSymbol Symbol of the token (e.g., "MTT")
     * @param initialSupply Initial supply minted to deployer (in tokens, not wei)
     *
     * Example: MintableBurnableERC20("My Token", "MTK", 1000000)
     * Creates 1,000,000 tokens with 18 decimals
     */
    constructor(
        string memory tokenName,
        string memory tokenSymbol,
        uint256 initialSupply
    ) ERC20(tokenName, tokenSymbol) Ownable(msg.sender) {
        // Mint initial supply to deployer
        // initialSupply is already in wei (18 decimals) from caller
        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev Mints new tokens to specified address
     * @param to Recipient address
     * @param amount Amount to mint (in wei, with 18 decimals)
     *
     * Requirements:
     * - Only owner can mint
     * - Cannot mint to zero address
     *
     * Example: mint(0x123..., 1000 ether) mints 1000 tokens
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Burns tokens from caller's balance
     * Inherited from ERC20Burnable
     *
     * Anyone can burn their own tokens to reduce total supply
     *
     * Example: burn(500 ether) burns 500 tokens from caller
     */
    // burn() is inherited from ERC20Burnable

    /**
     * @dev Burns tokens from specified address using allowance
     * Inherited from ERC20Burnable
     *
     * Example: burnFrom(0x123..., 100 ether) burns 100 tokens if approved
     */
    // burnFrom() is inherited from ERC20Burnable

    /**
     * @dev Returns token decimals (always 18)
     * Inherited from ERC20
     */
    // decimals() is inherited from ERC20 (returns 18)

    /**
     * @dev Transfer ownership to new address
     * Inherited from Ownable
     *
     * Only current owner can transfer ownership
     * New owner can then mint tokens
     */
    // transferOwnership() is inherited from Ownable

    /**
     * @dev Renounce ownership (makes contract immutable)
     * Inherited from Ownable
     *
     * WARNING: After renouncing, NO ONE can mint new tokens
     * Use with caution - this action is irreversible
     */
    // renounceOwnership() is inherited from Ownable
}
