# Test Contracts

This directory contains Solidity contracts for testing the EVM Chains MCP Server.

## SimpleERC20.sol

Minimal ERC20 token implementation based on OpenZeppelin v5 standards.

**Features**:
- Standard ERC20 transfer, approve, transferFrom
- Mint function for testing (⚠️ NO ACCESS CONTROL - TESTNET ONLY)
- Burn function for testing
- Compatible with ethers.js v6

**Compilation**:

```bash
# Install Solidity compiler
npm install -g solc

# Compile contract
solc --optimize --bin --abi contracts/SimpleERC20.sol -o contracts/build/

# Or use Remix IDE: https://remix.ethereum.org
```

**Usage in evm_deploy_token**:

The compiled bytecode and ABI are embedded in `src/tools/tokens/evm_deploy_token.ts`.

## Compilation Output

After compilation, you'll get:
- `SimpleERC20.bin` - Contract bytecode
- `SimpleERC20.abi` - Contract ABI

**Constructor Parameters**:
1. `string _name` - Token name (e.g., "Test Token")
2. `string _symbol` - Token symbol (e.g., "TEST")
3. `uint8 _decimals` - Token decimals (e.g., 18)
4. `uint256 _initialSupply` - Initial supply in smallest unit (e.g., 1000000 with 18 decimals = 1M tokens)

## Security Warning

⚠️ **TESTNET ONLY** ⚠️

The mint() function has NO ACCESS CONTROL. Anyone can mint tokens. This is intentional for testing purposes.

**DO NOT use this contract on mainnet or with real value.**
