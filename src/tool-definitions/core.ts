import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { OS_GUIDANCE, CHAIN_GUIDANCE, SUPPORTED_CHAINS } from '../constants/guidance.js';

export const CORE_TOOLS: Tool[] = [
    {
        name: 'evm_get_balance',
        description: `
Get native token balance for any EVM chain (ETH, POL, AVAX, BNB, etc.)

Returns the native token balance in both raw wei and human-readable ether units.
Works across all 7 supported EVM chains with automatic unit conversion.

CRITICAL RULES:
- Address MUST be a valid 0x-prefixed Ethereum address (42 characters)
- Balance is returned in both wei (raw) and ether (formatted) units
- All chains use 18 decimals for native tokens
- Returns 0 balance for non-existent addresses (not an error)

PARAMETERS:
- chain: EVM chain to query (required)
  * Supported: ethereum, polygon, avalanche, bsc, arbitrum, base, worldchain
  * Each chain has different RPC endpoints
  * Must be lowercase

- address: Ethereum address to check (required)
  * Format: 0x followed by 40 hexadecimal characters
  * Case-insensitive (checksummed addresses accepted)
  * Examples: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"

EXAMPLES:
✅ Check Ethereum balance:
  {chain: "ethereum", address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}

✅ Check Polygon balance:
  {chain: "polygon", address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"}

✅ Check BSC balance (low gas chain):
  {chain: "bsc", address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}

❌ Invalid - wrong chain name:
  {chain: "ethereum-sepolia", address: "0x..."}

❌ Invalid - missing 0x prefix:
  {chain: "ethereum", address: "742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating operation success
• chain: Chain name queried
• address: Address checked
• balance: Object with wei (string) and ether (string) values
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Using mainnet chain names instead of testnet identifiers
- Forgetting 0x prefix on address
- Expecting USD value (this tool returns native token balance only)
- Confusing wei with ether (1 ether = 10^18 wei)

USE CASES:
- Check if address has sufficient funds for transactions
- Monitor wallet balances across multiple chains
- Validate address exists before sending transactions
- Compare balances across different EVM networks

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: {
                    type: 'string',
                    enum: SUPPORTED_CHAINS,
                    description: 'EVM chain to query (ethereum, polygon, avalanche, bsc, arbitrum, base, worldchain)'
                },
                address: {
                    type: 'string',
                    description: 'Ethereum address in 0x format (42 characters)'
                }
            },
            required: ['chain', 'address']
        }
    },
    {
        name: 'evm_get_transaction',
        description: `
Get transaction details including status, gas used, receipt, and execution results.

Retrieves comprehensive transaction information from the blockchain, including confirmation status,
gas usage, block inclusion, and any emitted events or logs.

CRITICAL RULES:
- Transaction hash MUST be a valid 0x-prefixed hex string (66 characters: 0x + 64 hex digits)
- Transaction must exist on the specified chain (returns null if not found)
- Pending transactions show null block number and confirmation count
- Failed transactions are included (check status field)

PARAMETERS:
- chain: EVM chain to query (required)
  * Must match one of the 7 supported chains
  * Transaction hashes are chain-specific
  * Same hash on different chains refers to different transactions

- txHash: Transaction hash to retrieve (required)
  * Format: 0x followed by 64 hexadecimal characters
  * Case-insensitive
  * Example: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"

EXAMPLES:
✅ Get confirmed transaction:
  {chain: "polygon", txHash: "0x1234...abcd"}

✅ Check pending transaction:
  {chain: "ethereum", txHash: "0xabcd...1234"}

✅ Analyze failed transaction:
  {chain: "bsc", txHash: "0x9876...fedc"}

❌ Invalid - wrong hash length:
  {chain: "polygon", txHash: "0x1234"}

❌ Invalid - missing 0x prefix:
  {chain: "ethereum", txHash: "1234567890abcdef..."}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating operation success
• transaction: Object with transaction details
  - hash: Transaction hash
  - from: Sender address
  - to: Recipient address (null for contract creation)
  - value: Amount transferred in wei
  - gasPrice/maxFeePerGas: Gas pricing (EIP-1559 or legacy)
  - gasUsed: Actual gas consumed
  - blockNumber: Block inclusion (null if pending)
  - status: 1 (success) or 0 (failed)
  - logs: Array of emitted events
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Using transaction hash from wrong chain
- Forgetting 0x prefix on hash
- Not checking status field (assuming all transactions succeeded)
- Expecting instant confirmation (some chains take time)

USE CASES:
- Verify transaction succeeded before proceeding
- Check gas costs for transaction types
- Debug failed transactions via logs
- Monitor transaction confirmation status
- Analyze contract event emissions

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
                txHash: {
                    type: 'string',
                    description: 'Transaction hash (0x... - 66 characters)'
                }
            },
            required: ['chain', 'txHash']
        }
    },
    {
        name: 'evm_get_chain_info',
        description: `
Get comprehensive information about supported EVM chains including network status and configuration.

Returns detailed chain specifications, RPC endpoints, explorers, current block height, gas prices,
and connection status. Use "all" to get comparative overview of all 7 chains.

CRITICAL RULES:
- Returns current live data (block number, gas price) if chain is connected
- "all" option provides quick comparison across all chains
- Testnet chain IDs are different from mainnet (don't confuse them)
- RPC URLs are configurable via environment variables

PARAMETERS:
- chain: Chain identifier or "all" (required)
  * Supported chains: ethereum, polygon, avalanche, bsc, arbitrum, base, worldchain
  * Special value "all" returns info for all chains
  * Must be lowercase

EXAMPLES:
✅ Get single chain info:
  {chain: "polygon"}

✅ Compare all chains:
  {chain: "all"}

✅ Check Ethereum Sepolia config:
  {chain: "ethereum"}

❌ Invalid - wrong chain name:
  {chain: "eth"}

❌ Invalid - mainnet name:
  {chain: "ethereum-mainnet"}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating operation success
• chain(s): Chain identifier(s)
• name: Full chain name
• chainId: Numeric chain ID
• nativeToken: Native token symbol (ETH, POL, etc.)
• rpcUrl: RPC endpoint URL
• explorer: Block explorer base URL
• testnet: Boolean (always true for this server)
• connected: Boolean connection status
• currentBlock: Latest block number (if connected)
• gasPrice: Current gas price in gwei (if connected)
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Using mainnet chain names expecting testnet data
- Not checking "connected" field before trusting block data
- Assuming all chains have same gas costs (they vary dramatically)
- Hardcoding chain IDs without consulting this tool

USE CASES:
- Discover available chains and their configurations
- Compare gas prices across chains before choosing where to deploy
- Verify RPC connection status before batch operations
- Get block explorer URLs for transaction links
- Check chain IDs for wallet configuration

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: {
                    type: 'string',
                    enum: [...SUPPORTED_CHAINS, 'all'],
                    description: 'Chain to get info for, or "all" for all chains'
                }
            },
            required: ['chain']
        }
    },
    {
        name: 'evm_get_block',
        description: `
Get detailed block information including transactions, gas usage, miner, and timestamps.

Retrieves comprehensive block data from any EVM chain. Supports querying by block number, block hash,
or special keywords like "latest", "earliest", "pending".

CRITICAL RULES:
- Block numbers can be decimal (12345) or hex (0x3039)
- Block hashes are 0x-prefixed 32-byte hex strings (66 characters)
- "latest" returns most recent mined block
- Returns transaction hashes by default (not full transaction objects)

PARAMETERS:
- chain: EVM chain to query (required)
  * Block numbers are chain-specific
  * Different chains have different block times

- blockNumberOrHash: Block identifier (required)
  * Block number: "12345" or "0x3039"
  * Block hash: "0x1234...abcd" (66 characters)
  * Keywords: "latest", "earliest", "pending"

EXAMPLES:
✅ Get latest block:
  {chain: "polygon", blockNumberOrHash: "latest"}

✅ Get specific block by number:
  {chain: "ethereum", blockNumberOrHash: "5000000"}

✅ Get block by hash:
  {chain: "arbitrum", blockNumberOrHash: "0xabcd1234..."}

❌ Invalid - wrong keyword:
  {chain: "polygon", blockNumberOrHash: "newest"}

❌ Invalid - negative block number:
  {chain: "bsc", blockNumberOrHash: "-1"}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating operation success
• block: Object with block details
  - number: Block number
  - hash: Block hash
  - parentHash: Previous block hash
  - timestamp: Unix timestamp
  - miner/coinbase: Block producer address
  - gasUsed: Total gas used in block
  - gasLimit: Block gas limit
  - baseFeePerGas: EIP-1559 base fee (if applicable)
  - transactions: Array of transaction hashes
  - transactionCount: Number of transactions
  - difficulty: Mining difficulty (PoW chains)
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Fetching blocks too fast (respect RPC rate limits)
- Not handling reorgs (blocks can become orphaned)
- Assuming "latest" is finalized (may be reorganized)
- Comparing block timestamps across chains (different block times)

USE CASES:
- Monitor blockchain state and height
- Calculate average gas usage per block
- Track block production times
- Analyze transaction throughput
- Detect block reorganizations

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
                blockNumberOrHash: {
                    type: 'string',
                    description: 'Block number, hash, or "latest"/"earliest"/"pending"'
                }
            },
            required: ['chain', 'blockNumberOrHash']
        }
    },
    {
        name: 'evm_validate_address',
        description: `
Validate Ethereum address format, checksum, and determine if it's a contract or EOA.

Performs comprehensive address validation including format checking, EIP-55 checksum verification,
and on-chain contract detection. Essential for preventing transaction errors.

CRITICAL RULES:
- Address MUST be 42 characters (0x + 40 hex digits)
- Validates EIP-55 checksum if provided (mixed case)
- Distinguishes between Externally Owned Accounts (EOA) and contracts
- Returns validation status even for invalid addresses (doesn't throw)

PARAMETERS:
- chain: EVM chain to check contract status (required)
  * Contract detection requires chain query
  * Same address may be EOA on one chain, contract on another
  * Validation format rules are universal across chains

- address: Ethereum address to validate (required)
  * Format: 0x followed by 40 hexadecimal characters
  * Can be lowercase, uppercase, or mixed case (checksummed)
  * Examples: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" (checksummed)

EXAMPLES:
✅ Validate checksummed address:
  {chain: "ethereum", address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}

✅ Check if address is contract:
  {chain: "polygon", address: "0x1234567890123456789012345678901234567890"}

✅ Validate lowercase address:
  {chain: "bsc", address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"}

❌ Invalid - wrong length:
  {chain: "ethereum", address: "0x1234"}

❌ Invalid - missing 0x prefix:
  {chain: "polygon", address: "742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating operation success
• valid: Boolean - is address format valid?
• checksumValid: Boolean - does checksum match? (null if all lowercase/uppercase)
• isContract: Boolean - is this a contract address?
• address: Original input address
• checksummedAddress: Properly checksummed version (EIP-55)
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Not checking both "valid" and "isContract" fields
- Assuming checksum validation failure means invalid address
- Forgetting addresses can be contracts on some chains but not others
- Not using checksummed addresses in user interfaces

USE CASES:
- Validate user input before sending transactions
- Distinguish between wallet addresses and contract addresses
- Verify address checksums for security
- Convert addresses to proper EIP-55 format
- Prevent sending tokens to wrong address types

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
                    description: 'Ethereum address to validate (0x... - 42 characters)'
                }
            },
            required: ['chain', 'address']
        }
    },
    {
        name: 'evm_get_account_info',
        description: `
Get comprehensive account information including balance, nonce, contract code, and account type.

Retrieves complete account state from the blockchain in a single call. More efficient than multiple
separate queries for balance, nonce, and contract status.

CRITICAL RULES:
- Returns balance in both wei and ether units
- Nonce indicates number of transactions sent from this address
- Contract code is returned if address is a smart contract
- All data reflects current blockchain state (not historical)

PARAMETERS:
- chain: EVM chain to query (required)
  * Account state is chain-specific
  * Same address can have different states on different chains

- address: Ethereum address to query (required)
  * Format: 0x followed by 40 hexadecimal characters
  * Works for both EOA and contract addresses
  * Example: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"

EXAMPLES:
✅ Check wallet account info:
  {chain: "ethereum", address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}

✅ Inspect contract account:
  {chain: "polygon", address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"}

✅ Verify nonce before transaction:
  {chain: "bsc", address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"}

❌ Invalid - wrong format:
  {chain: "ethereum", address: "0x123"}

❌ Invalid - not checksummed warning:
  {chain: "polygon", address: "0X742D35CC6634C0532925A3B844BC9E7595F0BEB"}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating operation success
• address: Queried address
• balance: Object with wei (string) and ether (string) values
• nonce: Transaction count (number of txs sent from this address)
• isContract: Boolean indicating if this is a contract
• contractCode: Hex string of bytecode (if contract), null otherwise
• codeHash: Keccak256 hash of contract code
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Expecting historical balance (this returns current state only)
- Confusing nonce with transaction count (nonce = sent transactions only)
- Not checking isContract before attempting contract interactions
- Assuming zero nonce means unused address (could have received funds)

USE CASES:
- Get complete account overview in one call
- Verify account has sufficient balance and correct nonce before signing
- Determine if address is contract before attempting transfer
- Audit account state for analytics
- Debug transaction nonce issues

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
                    description: 'Ethereum address (0x... - 42 characters)'
                }
            },
            required: ['chain', 'address']
        }
    },
    {
        name: 'evm_get_transaction_history',
        description: `
Get transaction history count and guidance for retrieving full transaction details.

Returns the transaction count (nonce) for an address and provides guidance on how to retrieve
full transaction history using block explorers. Standard RPC doesn't provide full history.

CRITICAL RULES:
- Returns transaction count (nonce), not full transaction list
- Full transaction history requires block explorer API or indexer
- Transaction count = number of transactions SENT from this address
- Does not include received transactions or internal transactions

PARAMETERS:
- chain: EVM chain to query (required)
  * Transaction count is chain-specific
  * Different chains have different explorer APIs

- address: Ethereum address to query (required)
  * Format: 0x followed by 40 hexadecimal characters
  * Transaction count for both EOA and contracts
  * Example: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"

- limit: Desired transaction count (optional, not implemented)
  * Included for API compatibility
  * Standard RPC doesn't support paginated transaction history
  * Use block explorer APIs for full history

EXAMPLES:
✅ Get transaction count:
  {chain: "ethereum", address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}

✅ Check if address has sent transactions:
  {chain: "polygon", address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"}

✅ Verify account activity:
  {chain: "bsc", address: "0x1234567890123456789012345678901234567890"}

❌ Invalid - expecting full transaction list:
  {chain: "ethereum", address: "0x...", limit: 100} // Only returns count

❌ Invalid - wrong address format:
  {chain: "polygon", address: "742d35Cc..."}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating operation success
• address: Queried address
• transactionCount: Number of transactions sent from this address
• guidance: Instructions for retrieving full transaction history
• explorerUrl: Block explorer link for manual viewing
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Expecting array of transactions (only returns count)
- Confusing sent transactions with received transactions
- Not using block explorer APIs for full history
- Assuming zero count means no activity (could have received funds)

USE CASES:
- Verify account has transaction history
- Check nonce before sending transaction
- Determine if address is active
- Guide users to block explorer for details
- Quick account activity check

ALTERNATIVES FOR FULL HISTORY:
- Etherscan API: eth.getTransactionsByAddress()
- Polygonscan API: Similar to Etherscan
- The Graph: Indexed blockchain data
- Alchemy/Infura: Enhanced APIs with transaction history

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
                    description: 'Ethereum address (0x... - 42 characters)'
                },
                limit: {
                    type: 'number',
                    description: 'Desired limit (not implemented - use block explorer APIs)'
                }
            },
            required: ['chain', 'address']
        }
    },
    {
        name: 'evm_send_transaction',
        description: `
Broadcast a signed transaction to the blockchain network for execution.

Submits a pre-signed transaction to the network's mempool for mining/validation. This is a write
operation that costs gas. Transaction must be signed offline before calling this tool.

CRITICAL RULES:
- Transaction MUST be signed before submission (this tool doesn't sign)
- Requires sufficient gas balance in sender account
- Transaction is irreversible once confirmed on-chain
- Returns transaction hash immediately (not final confirmation)
- Check transaction status after sending to verify success

PARAMETERS:
- chain: Target EVM chain for broadcast (required)
  * Transaction is chain-specific (cannot broadcast to wrong chain)
  * Gas costs vary dramatically between chains
  * Must match the chainId used during signing

- signedTransaction: RLP-encoded signed transaction (required)
  * Format: 0x followed by hex-encoded signed transaction bytes
  * Includes signature (v, r, s values)
  * Created using wallet signing tools (ethers, web3, etc.)
  * Example: "0xf86c..." (varies in length)

EXAMPLES:
✅ Send signed transaction:
  {chain: "polygon", signedTransaction: "0xf86c808504a817c800825208..."}

✅ Broadcast on low-gas chain:
  {chain: "bsc", signedTransaction: "0xf86d..."}

✅ Execute contract interaction:
  {chain: "ethereum", signedTransaction: "0xf8ab..."}

❌ Invalid - unsigned transaction:
  {chain: "polygon", signedTransaction: "0x..."} // Missing signature

❌ Invalid - wrong chain:
  {chain: "ethereum", signedTransaction: "..."} // Signed for polygon

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating broadcast success
• transactionHash: Unique transaction identifier (0x...)
• chain: Chain where transaction was broadcast
• status: "pending" (broadcasted but not confirmed)
• explorerUrl: Block explorer link to track transaction
• executionTime: Time taken to broadcast (not confirmation time)

COMMON MISTAKES:
- Expecting immediate confirmation (transactions take time to mine)
- Not checking transaction status after sending
- Forgetting to wait for confirmations before proceeding
- Using wrong chain RPC for signed transaction
- Insufficient gas balance causing transaction to fail

USE CASES:
- Execute token transfers after offline signing
- Deploy smart contracts
- Interact with DeFi protocols
- Send native currency transfers
- Batch transaction submissions

TRANSACTION LIFECYCLE:
1. Sign transaction offline (not in this tool)
2. Broadcast with this tool → returns txHash
3. Transaction enters mempool (pending)
4. Miner includes in block (1 confirmation)
5. Wait for additional confirmations for finality
6. Use evm_get_transaction to check final status

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: {
                    type: 'string',
                    enum: SUPPORTED_CHAINS,
                    description: 'EVM chain to send transaction to'
                },
                signedTransaction: {
                    type: 'string',
                    description: 'Signed transaction hex string (0x... RLP-encoded)'
                }
            },
            required: ['chain', 'signedTransaction']
        }
    },
    {
        name: 'evm_send_native_transfer',
        description: `
Send native tokens (ETH, POL, AVAX, etc.) from one address to another.

This tool handles the entire process of constructing, signing, and broadcasting a native token transfer.
It automatically fetches the nonce, estimates gas, and signs the transaction using the provided private key.

CRITICAL RULES:
- Requires sufficient native token balance in the sender account for the amount and gas fees.
- Transaction is irreversible once confirmed on-chain.
- Private key grants full control over the sender account - NEVER share or log it in production.

PARAMETERS:
- chain: EVM chain to execute the transfer on (required).
  * Must have gas in native token on this chain.

- toAddress: Recipient address (required).
  * Format: 0x followed by 40 hexadecimal characters.
  * Can be an EOA (user wallet) or a contract address.
  * VERIFY CAREFULLY - transactions are irreversible.

- amount: Amount to send in native token units (required).
  * Human-readable format: "0.01" = 0.01 native tokens.
  * Examples: "0.01", "1.5", "100".

- privateKey: Sender's private key (required, KEEP SECRET).
  * Format: 0x followed by 64 hexadecimal characters.
  * Must be the private key for the address that holds the native tokens.
  * Never expose, share, or log this value.

EXAMPLES:
✅ Send 0.01 ETH on Ethereum Sepolia:
  {chain: "ethereum", toAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", amount: "0.01", privateKey: "0xac0974..."}

✅ Send 0.5 POL on Polygon Amoy:
  {chain: "polygon", toAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", amount: "0.5", privateKey: "0x..."}

❌ Invalid - insufficient balance:
  {chain: "polygon", toAddress: "0x...", amount: "1000", privateKey: "0x..."} // Sender only has 10 POL

❌ Invalid - wrong private key format:
  {chain: "ethereum", toAddress: "0x...", amount: "0.01", privateKey: "invalid-key"}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating transaction success.
• chain: Chain where the transaction was executed.
• from: Sender address (derived from privateKey).
• to: Recipient address.
• amount: Amount transferred (formatted).
• transactionHash: Unique transaction identifier (0x...). Use this to track on a block explorer.
• gasUsed: Gas consumed by the transaction.
• blockNumber: Block containing the transaction.
• explorerUrl: Link to the transaction on the block explorer.
• message: Confirmation message.
• executionTime: Time taken in milliseconds.

COMMON MISTAKES:
- Not checking sender has sufficient native token balance for amount + gas.
- Wrong recipient address (DOUBLE CHECK - irreversible).
- Using a private key for an address that doesn't own the tokens.
- Not waiting for transaction confirmation before assuming success.

USE CASES:
- Transfer native tokens between wallets.
- Fund new accounts.
- Pay for services or products in native currency.
- Test native token transfer functionality.

TRANSACTION FLOW:
1. Get sender's nonce.
2. Estimate gas limit and current gas price.
3. Construct the raw transaction object.
4. Sign the transaction using the private key.
5. Broadcast the signed transaction to the network.
6. Wait for the transaction receipt for confirmation.

SECURITY NOTES:
- Verify recipient address carefully (no undo).
- Never transfer to the zero address (0x0000...0000) unless intentionally burning.
- Keep private keys secure and never share or log them in production environments.
- Start with small test amounts on unfamiliar chains.

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: {
                    type: 'string',
                    enum: SUPPORTED_CHAINS,
                    description: 'EVM chain to execute on'
                },
                toAddress: {
                    type: 'string',
                    description: 'Recipient address (0x...)'
                },
                amount: {
                    type: 'string',
                    description: 'Amount to send in native token units (e.g., "0.01")'
                },
                privateKey: {
                    type: 'string',
                    description: 'Sender private key (0x...)'
                }
            },
            required: ['chain', 'toAddress', 'amount', 'privateKey']
        }
    },
    {
        name: 'evm_get_gas_price',
        description: `
Get current gas price for optimal transaction pricing on any EVM chain.

Returns current gas pricing information in both legacy format (gasPrice) and EIP-1559 format
(baseFeePerGas + maxPriorityFeePerGas) depending on chain support.

CRITICAL RULES:
- EIP-1559 chains return base fee + priority fee structure
- Legacy chains return single gasPrice value
- Gas prices fluctuate constantly (poll frequently for accuracy)
- Higher gas price = faster confirmation (competitive fee market)
- Gas price returned in wei (divide by 1e9 for gwei)

PARAMETERS:
- chain: EVM chain to query gas prices (required)
  * Each chain has different gas price ranges
  * Ethereum: typically highest gas costs
  * L2s (Arbitrum, Base): 10-50x cheaper
  * Sidechains (Polygon, BSC): very low gas costs

EXAMPLES:
✅ Check Ethereum gas price:
  {chain: "ethereum"}

✅ Compare Polygon fees:
  {chain: "polygon"}

✅ Get BSC gas price:
  {chain: "bsc"}

❌ Invalid - typo in chain name:
  {chain: "etherum"}

❌ Invalid - mainnet name:
  {chain: "ethereum-mainnet"}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE (EIP-1559 chains):
• success: Boolean indicating operation success
• chain: Queried chain identifier
• eip1559: Boolean indicating EIP-1559 support
• baseFeePerGas: Base fee in wei (burned)
• maxPriorityFeePerGas: Suggested tip in wei (to validators)
• maxFeePerGas: Maximum total fee willing to pay
• gasPrice: Legacy format (baseFee + priorityFee) for compatibility
• gasPriceGwei: Human-readable gas price in gwei
• executionTime: Time taken in milliseconds

OUTPUT STRUCTURE (Legacy chains):
• success: Boolean indicating operation success
• chain: Queried chain identifier
• eip1559: false
• gasPrice: Current gas price in wei
• gasPriceGwei: Human-readable gas price in gwei
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Using stale gas prices (should poll before each transaction)
- Not converting wei to gwei for display
- Assuming same gas costs across all chains
- Setting gas price too low (transaction may not confirm)
- Forgetting gas price spikes during network congestion

USE CASES:
- Determine optimal transaction timing
- Calculate transaction cost estimates
- Monitor network congestion via gas prices
- Compare chain costs for multi-chain applications
- Set appropriate gas limits for transactions

GAS PRICE STRATEGIES:
- Standard: Use returned maxFeePerGas (normal confirmation)
- Fast: Multiply maxPriorityFeePerGas by 1.2-1.5 (faster confirmation)
- Slow: Use minimum maxPriorityFeePerGas (slower but cheaper)
- Instant: Multiply maxPriorityFeePerGas by 2+ (next block)

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: {
                    type: 'string',
                    enum: SUPPORTED_CHAINS,
                    description: 'EVM chain to query'
                }
            },
            required: ['chain']
        }
    },
    {
        name: 'evm_estimate_gas',
        description: `
Estimate gas required for a transaction with automatic 20% safety buffer.

Simulates transaction execution to determine gas consumption. Returns estimated gas limit
with built-in safety buffer to prevent out-of-gas failures.

CRITICAL RULES:
- Estimation simulates execution without committing to blockchain
- Includes 20% safety buffer above raw estimate
- May fail if transaction would revert (shows reason)
- Gas estimate varies based on contract state and input data
- "from" address must have sufficient balance if checking value transfers

PARAMETERS:
- chain: EVM chain for gas estimation (required)
  * Gas costs are chain-specific
  * Same transaction uses different gas on different chains
  * Example: Contract call may cost 200k gas on Ethereum, 150k on Polygon

- from: Sender address (optional but recommended)
  * Required for checking balance requirements
  * Affects gas calculation for some contracts
  * Use zero address (0x0000...0000) if unknown

- to: Target address (required)
  * Contract address for contract calls
  * EOA address for simple transfers
  * Format: 0x followed by 40 hex characters

- value: Amount to send in ether (optional)
  * For native currency transfers
  * Example: "0.1" for 0.1 ETH/POL/etc.
  * Leave empty for zero-value transactions

- data: Transaction data (optional)
  * Hex-encoded function call data for contracts
  * Empty for simple transfers
  * Format: 0x + hex string

EXAMPLES:
✅ Estimate simple transfer:
  {chain: "polygon", to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", value: "0.1"}

✅ Estimate contract call:
  {chain: "ethereum", from: "0x...", to: "0x...", data: "0xa9059cbb..."}

✅ Check deployment gas:
  {chain: "bsc", to: "0x0000000000000000000000000000000000000000", data: "0x608060..."}

❌ Invalid - missing recipient:
  {chain: "polygon", value: "1.0"} // No "to" address

❌ Invalid - wrong data format:
  {chain: "ethereum", to: "0x...", data: "abc123"} // Missing 0x prefix

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating estimation success
• chain: Chain used for estimation
• estimatedGas: Raw gas estimate (units)
• gasLimit: Recommended gas limit (with 20% buffer)
• estimatedCost: Approximate cost in native currency
• gasPrice: Current gas price used for cost calculation
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Not including "from" when balance checks matter
- Using estimated gas without safety buffer (use gasLimit instead)
- Estimating with stale state (contract state may change)
- Forgetting gas estimates can fail if transaction would revert
- Not accounting for gas price in total cost calculation

USE CASES:
- Calculate transaction costs before signing
- Verify contract interactions will succeed
- Determine optimal gas limits for transactions
- Compare gas costs across different contract methods
- Budget for transaction batches

GAS ESTIMATION TIPS:
- Add 20-30% buffer to raw estimates for safety
- Re-estimate before submitting if state has changed
- Higher gas limit doesn't cost more (only gas used is charged)
- Failed estimates often indicate transaction will revert
- Contract calls use more gas than simple transfers

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: {
                    type: 'string',
                    enum: SUPPORTED_CHAINS,
                    description: 'EVM chain to estimate gas on'
                },
                from: {
                    type: 'string',
                    description: 'Sender address (optional but recommended, 0x...)'
                },
                to: {
                    type: 'string',
                    description: 'Recipient address (0x... - 42 characters)'
                },
                value: {
                    type: 'string',
                    description: 'Amount to send in ether (optional, e.g., "0.1")'
                },
                data: {
                    type: 'string',
                    description: 'Transaction data (optional, 0x... hex string)'
                }
            },
            required: ['chain', 'to']
        }
    }
];
