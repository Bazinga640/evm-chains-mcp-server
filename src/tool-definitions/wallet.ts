import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { OS_GUIDANCE, CHAIN_GUIDANCE, SUPPORTED_CHAINS } from '../constants/guidance.js';

export const WALLET_TOOLS: Tool[] = [
    {
        name: 'evm_create_wallet',
        description: `
Create a new HD wallet with BIP39 mnemonic phrase and derived address.

Generates a cryptographically secure hierarchical deterministic (HD) wallet using BIP39 standard.
Returns mnemonic phrase, private key, and address. Works identically across all EVM chains.

CRITICAL RULES:
- Mnemonic phrase is the master secret (NEVER share or log it)
- Private key derived using BIP44 path: m/44'/60'/0'/0/0
- Same mnemonic generates same address on all EVM chains
- Store mnemonic securely - it cannot be recovered if lost
- Wallet is created locally (not registered on-chain)

PARAMETERS:
- chain: EVM chain context (required but doesn't affect generation)
  * Same wallet works on all EVM chains
  * Chain parameter for consistency with other tools
  * Wallet address is identical across ethereum, polygon, bsc, etc.

EXAMPLES:
✅ Create new wallet:
  {chain: "polygon"}

✅ Generate wallet for multi-chain use:
  {chain: "ethereum"}

✅ Create test wallet:
  {chain: "bsc"}

❌ Invalid - chain doesn't exist:
  {chain: "bitcoin"}

❌ Invalid - typo in chain:
  {chain: "etherium"}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating operation success
• chain: Chain context used
• mnemonic: 12-word BIP39 seed phrase (KEEP SECRET)
• privateKey: Hex-encoded private key (KEEP SECRET)
• address: Public wallet address (0x...)
• derivationPath: BIP44 path used (m/44'/60'/0'/0/0)
• warning: Security reminder about mnemonic storage
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Logging or displaying mnemonic in production
- Not backing up mnemonic before using wallet
- Assuming wallet is registered on-chain (it's not)
- Sharing private key instead of public address
- Using same wallet for testing and production

USE CASES:
- Generate fresh wallet for user onboarding
- Create burner wallets for testing
- Implement multi-chain wallet solutions
- Generate addresses for cold storage
- Automate wallet creation for services

SECURITY BEST PRACTICES:
- Store mnemonic in encrypted form
- Never transmit mnemonic over network
- Use hardware wallets for significant funds
- Implement mnemonic backup flows for users
- Consider multi-sig for high-value accounts

WALLET LIFECYCLE:
1. Generate with this tool → get mnemonic + address
2. Backup mnemonic securely
3. Fund address via faucet or transfer
4. Use private key to sign transactions
5. Import to MetaMask/other wallets using mnemonic

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: {
                    type: 'string',
                    enum: SUPPORTED_CHAINS,
                    description: 'EVM chain context (wallet works on all chains)'
                },
                includeSecrets: {
                    type: 'boolean',
                    description: 'Include mnemonic and private key in response (default: false, NOT RECOMMENDED for production)'
                }
            },
            required: ['chain']
        }
    },
    {
        name: 'evm_import_wallet',
        description: `
Import existing wallet from private key or BIP39 mnemonic with custom derivation path.

Reconstructs wallet from either a raw private key or mnemonic seed phrase. Supports custom
BIP44 derivation paths for advanced use cases. Essential for wallet recovery and migration.

CRITICAL RULES:
- Must provide either privateKey OR mnemonic (not both, not neither)
- Private keys are 64 hex characters (with or without 0x prefix)
- Mnemonics are 12 or 24 words separated by spaces
- Custom derivation paths must follow BIP44 format
- Imported wallet works across all EVM chains

PARAMETERS:
- chain: EVM chain context (required)
  * Doesn't affect import (same wallet works everywhere)
  * Used for consistency with other wallet tools

- privateKey: Raw private key (optional - use if you have key)
  * Format: 0x followed by 64 hex characters OR 64 hex without prefix
  * Example: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
  * Takes precedence if both privateKey and mnemonic provided

- mnemonic: BIP39 seed phrase (optional - use if you have mnemonic)
  * 12 or 24 words separated by single spaces
  * Example: "test test test test test test test test test test test junk"
  * Requires derivationPath parameter to generate specific address

- derivationPath: BIP44 path (optional, default: m/44'/60'/0'/0/0)
  * Only used with mnemonic imports
  * Format: m/44'/60'/account'/change/index
  * Default generates first address (index 0)
  * Example: "m/44'/60'/0'/0/5" for 6th address

EXAMPLES:
✅ Import from private key:
  {chain: "polygon", privateKey: "0xac0974..."}

✅ Import from mnemonic (default path):
  {chain: "ethereum", mnemonic: "test test test..."}

✅ Import specific address from mnemonic:
  {chain: "bsc", mnemonic: "word1 word2...", derivationPath: "m/44'/60'/0'/0/5"}

❌ Invalid - neither key nor mnemonic:
  {chain: "polygon"}

❌ Invalid - wrong key format:
  {chain: "ethereum", privateKey: "1234"}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating operation success
• chain: Chain context used
• address: Derived public address (0x...)
• privateKey: Private key (0x... - KEEP SECRET)
• derivationPath: Path used (only for mnemonic imports)
• importMethod: "privateKey" or "mnemonic"
• warning: Security reminder
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Providing both privateKey and mnemonic (only one needed)
- Wrong mnemonic word count (must be 12 or 24)
- Invalid derivation path format
- Not securing imported credentials
- Importing production keys in development environments

USE CASES:
- Recover wallet from backup
- Migrate wallet between applications
- Import MetaMask/hardware wallet addresses
- Restore from mnemonic backup
- Generate multiple addresses from one seed

IMPORT STRATEGIES:
- Private Key: Direct import, works immediately
- Mnemonic + Default Path: Import first wallet address
- Mnemonic + Custom Path: Import specific account/address
- Hardware Wallet Compatibility: Use standard paths

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: {
                    type: 'string',
                    enum: SUPPORTED_CHAINS,
                    description: 'EVM chain context'
                },
                privateKey: {
                    type: 'string',
                    description: 'Private key (0x... or 64 hex chars, optional)'
                },
                mnemonic: {
                    type: 'string',
                    description: 'Mnemonic phrase (12 or 24 words, optional)'
                },
                derivationPath: {
                    type: 'string',
                    description: 'BIP44 derivation path (optional, default: m/44\'/60\'/0\'/0/0)'
                }
            },
            required: ['chain']
        }
    },
    {
        name: 'evm_generate_address',
        description: `
Generate specific address from mnemonic using custom BIP44 derivation parameters.

Derives addresses from a mnemonic seed phrase using customizable BIP44 path components.
Perfect for generating multiple addresses from a single seed or matching hardware wallet addresses.

CRITICAL RULES:
- Generates deterministic addresses (same inputs = same output)
- Default path m/44'/60'/0'/0/0 generates first address
- Index parameter most commonly changed (generates address sequence)
- Account parameter for separate "accounts" from same seed
- All generated addresses work on all EVM chains

PARAMETERS:
- chain: EVM chain context (required)
  * Doesn't affect generation (addresses work everywhere)
  * Used for optional balance checking

- mnemonic: BIP39 seed phrase (required)
  * 12 or 24 words separated by spaces
  * Must be valid BIP39 phrase
  * Example: "test test test test test test test test test test test junk"

- index: Address index (optional, default: 0)
  * Most commonly modified parameter
  * Generates sequence: index 0, 1, 2, 3...
  * MetaMask/wallets use sequential indices
  * Example: index=5 gives 6th address

- account: Account number (optional, default: 0)
  * For separate "accounts" from same seed
  * Less commonly changed than index
  * Path: m/44'/60'/account'/0/index

- change: Change index (optional, default: 0)
  * 0 = external addresses (receiving)
  * 1 = internal addresses (change)
  * Rarely changed in practice

EXAMPLES:
✅ Generate first address:
  {chain: "polygon", mnemonic: "test test..."}

✅ Generate 6th address:
  {chain: "ethereum", mnemonic: "word1 word2...", index: 5}

✅ Generate from second account:
  {chain: "bsc", mnemonic: "seed words...", account: 1, index: 0}

❌ Invalid - wrong mnemonic format:
  {chain: "polygon", mnemonic: "not-valid-words"}

❌ Invalid - negative index:
  {chain: "ethereum", mnemonic: "...", index: -1}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating operation success
• address: Generated address (0x...)
• derivationPath: Full BIP44 path used
• index: Address index used
• account: Account number used
• mnemonic: Original mnemonic (NOT recommended to return in production)
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Confusing index with account (index changes more frequently)
- Not matching hardware wallet derivation paths
- Generating too many addresses without tracking usage
- Not documenting which indices are in use

USE CASES:
- Generate address sequences for user wallets
- Match hardware wallet addresses (Ledger/Trezor)
- Create multiple addresses from single backup
- Implement HD wallet derivation
- Generate fresh addresses for privacy

ADDRESS GENERATION PATTERNS:
- Sequential: index 0, 1, 2, 3... (most common)
- Multiple Accounts: account 0, 1, 2 with index 0 each
- Hardware Wallet Match: Use same account/index as device
- Change Addresses: Use change=1 for internal transfers

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: {
                    type: 'string',
                    enum: SUPPORTED_CHAINS,
                    description: 'EVM chain context'
                },
                mnemonic: {
                    type: 'string',
                    description: 'Mnemonic phrase (12 or 24 words)'
                },
                index: {
                    type: 'number',
                    description: 'Address index (default: 0)'
                },
                account: {
                    type: 'number',
                    description: 'Account number (default: 0)'
                },
                change: {
                    type: 'number',
                    description: 'Change index (0 for external, 1 for internal, default: 0)'
                }
            },
            required: ['chain', 'mnemonic']
        }
    },
    {
        name: 'evm_get_wallet_info',
        description: `
Get comprehensive wallet information without exposing sensitive private keys.

Retrieves public wallet data including balance, transaction count, and account status.
Safe to use for displaying wallet info to users without security risks.

CRITICAL RULES:
- Does NOT return private keys or mnemonic (safe for display)
- Shows current blockchain state (not historical)
- Returns same data as evm_get_account_info but formatted for wallet context
- Combines balance + nonce + contract check in one call

PARAMETERS:
- chain: EVM chain to query (required)
  * Wallet state is chain-specific
  * Same address may have different balances/nonces per chain

- address: Wallet address to inspect (required)
  * Format: 0x followed by 40 hex characters
  * Works for any address (doesn't need to be "imported")
  * Example: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"

EXAMPLES:
✅ Check wallet info:
  {chain: "polygon", address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}

✅ Verify wallet status:
  {chain: "ethereum", address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"}

✅ Display to user:
  {chain: "bsc", address: "0x..."}

❌ Invalid - wrong format:
  {chain: "polygon", address: "0x123"}

❌ Invalid - not checksummed (works but not recommended):
  {chain: "ethereum", address: "0xABC..."} // All caps

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating operation success
• address: Queried address (checksummed)
• balance: Object with wei and ether values
• nonce: Transaction count (txs sent from this address)
• isContract: Boolean (false for wallets, true for contracts)
• hasActivity: Boolean (true if nonce > 0 or balance > 0)
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Expecting private key in response (not returned for security)
- Confusing with evm_get_account_info (same data, different context)
- Not checking isContract before treating as wallet
- Assuming zero balance means unused (could have sent everything)

USE CASES:
- Display wallet balance in UI
- Check if wallet has funds before transaction
- Verify wallet activity status
- Show transaction count to users
- Validate wallet exists and is active

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: {
                    type: 'string',
                    enum: SUPPORTED_CHAINS,
                    description: 'EVM chain to query'
                },
                address: {
                    type: 'string',
                    description: 'Wallet address (0x... - 42 characters)'
                }
            },
            required: ['chain', 'address']
        }
    },
    {
        name: 'evm_sign_message',
        description: `
Sign arbitrary message for authentication, verification, or proof-of-ownership (NOT a transaction).

Creates cryptographic signature of a message using private key. Used for authentication flows,
message verification, and proving address ownership. Does not broadcast to blockchain.

CRITICAL RULES:
- Signs messages, NOT transactions (no gas cost, no broadcast)
- Signature can be verified without exposing private key
- Standard EIP-191 message signing (\\x19Ethereum Signed Message prefix)
- Anyone can verify signature matches address (public verification)
- Signature is deterministic (same message+key = same signature)

PARAMETERS:
- chain: EVM chain context (required but doesn't affect signature)
  * Signature works across all chains
  * Chain parameter for consistency

- message: Text message to sign (required)
  * Any UTF-8 text string
  * Common uses: "Sign in to {app}", "Prove ownership", timestamps
  * Example: "I approve this action at 2024-01-15T10:30:00Z"

- privateKey: Signing key (required, KEEP SECRET)
  * Format: 0x followed by 64 hex characters
  * Must be key for address you want to prove ownership of
  * Never share or log this value

EXAMPLES:
✅ Sign authentication message:
  {chain: "polygon", message: "Sign in to MyApp", privateKey: "0xac0974..."}

✅ Prove ownership with timestamp:
  {chain: "ethereum", message: "I own this address - 2024-01-15", privateKey: "0x..."}

✅ Sign structured data:
  {chain: "bsc", message: "Action: transfer\\nAmount: 100\\nTimestamp: 1234567890", privateKey: "0x..."}

❌ Invalid - trying to sign transaction:
  {chain: "polygon", message: "0xf86c...", privateKey: "0x..."} // Use evm_send_transaction

❌ Invalid - wrong key format:
  {chain: "ethereum", message: "test", privateKey: "1234"}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating signing success
• message: Original message that was signed
• signature: ECDSA signature (0x... 130 hex chars: r + s + v)
• address: Address that created signature (derived from privateKey)
• messageHash: Keccak256 hash of prefixed message
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Trying to sign transactions (use evm_send_transaction instead)
- Not including timestamp in message (vulnerable to replay)
- Exposing private key accidentally
- Not implementing signature verification on backend
- Assuming signatures expire (they don't - add expiry in message)

USE CASES:
- Web3 authentication (Sign-In with Ethereum)
- Prove address ownership without transaction
- Off-chain message verification
- Create signed permits/approvals
- Generate proofs for access control

SIGNATURE VERIFICATION:
- Frontend: Use ethers.verifyMessage(message, signature)
- Backend: Recover address from signature and compare
- Anyone can verify signature without private key
- Signature proves message was signed by address

SECURITY NOTES:
- Never sign messages from untrusted sources
- Include context in message (app name, action, timestamp)
- Implement message expiry (include timestamp users should check)
- Don't sign messages that look like transactions

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: {
                    type: 'string',
                    enum: SUPPORTED_CHAINS,
                    description: 'EVM chain context'
                },
                message: {
                    type: 'string',
                    description: 'Message to sign (any UTF-8 text)'
                },
                privateKey: {
                    type: 'string',
                    description: 'Private key to sign with (0x... - KEEP SECRET)'
                }
            },
            required: ['chain', 'message', 'privateKey']
        }
    }
];
