import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { OS_GUIDANCE, CHAIN_GUIDANCE, SUPPORTED_CHAINS } from '../constants/guidance.js';

export const TOKENS_TOOLS: Tool[] = [
    {
        name: 'evm_get_token_balance',
        description: `
Get ERC20 token balance for any wallet address on any supported EVM chain.

Returns the token balance in both raw units and human-readable format accounting for token decimals.
Works with any ERC20-compliant token contract across all 7 supported EVM chains.

CRITICAL RULES:
- Token address MUST be a valid ERC20 contract (has decimals(), balanceOf())
- Returns 0 balance for addresses that never held the token (not an error)
- Decimals are fetched automatically from token contract (typically 6 or 18)
- Balance units depend on token decimals (USDC=6, most tokens=18)
- Does NOT work with native tokens (use evm_get_balance for ETH/POL/etc)

PARAMETERS:
- chain: EVM chain where token is deployed (required)
  * Token contracts are chain-specific
  * Same token may have different addresses per chain
  * Example: USDC on Polygon vs USDC on Ethereum

- tokenAddress: ERC20 token contract address (required)
  * Format: 0x followed by 40 hex characters
  * Must be deployed contract with ERC20 interface
  * Examples: USDC, USDT, DAI, WETH, custom tokens

- walletAddress: Address to check balance for (required)
  * Any valid Ethereum address
  * Can be EOA (user wallet) or contract address
  * Format: 0x followed by 40 hex characters

EXAMPLES:
✅ Check USDC balance on Polygon:
  {chain: "polygon", tokenAddress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}

✅ Check custom token on BSC:
  {chain: "bsc", tokenAddress: "0x...", walletAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"}

✅ Check WETH balance on Arbitrum:
  {chain: "arbitrum", tokenAddress: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", walletAddress: "0x..."}

❌ Invalid - trying to check native ETH (use evm_get_balance):
  {chain: "ethereum", tokenAddress: "0x0000000000000000000000000000000000000000", walletAddress: "0x..."}

❌ Invalid - wrong chain (token not deployed there):
  {chain: "avalanche", tokenAddress: "0x2791Bca...POLYGON_USDC", walletAddress: "0x..."}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating query success
• chain: Chain queried
• tokenAddress: Token contract address
• walletAddress: Wallet checked
• balance: Object with raw (string) and formatted (string) values
• decimals: Number of decimals the token uses
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Using native token address (use evm_get_balance for ETH/POL/AVAX)
- Using token address from wrong chain (USDC Polygon ≠ USDC Ethereum)
- Not accounting for decimals when interpreting raw balance
- Expecting USD value (this returns token units, not dollar value)
- Forgetting tokens are chain-specific (must deploy/bridge to each chain)

USE CASES:
- Check token holdings before initiating transfers
- Verify token receipt after purchase or swap
- Monitor token balances across multiple chains
- Validate sufficient token balance for DeFi operations
- Build portfolio tracking dashboards

TOKEN DECIMALS REFERENCE:
- Most tokens: 18 decimals (same as ETH)
- Stablecoins (USDC, USDT): 6 decimals
- Bitcoin-pegged (WBTC): 8 decimals
- Custom tokens: varies (fetched automatically)

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
                tokenAddress: {
                    type: 'string',
                    description: 'ERC20 token contract address (0x...)'
                },
                walletAddress: {
                    type: 'string',
                    description: 'Wallet address to check balance for (0x...)'
                }
            },
            required: ['chain', 'tokenAddress', 'walletAddress']
        }
    },
    {
        name: 'evm_get_token_info',
        description: `
Get comprehensive ERC20 token metadata and information from any EVM chain.

Fetches name, symbol, decimals, and total supply directly from the token contract's public methods.
Essential for understanding token properties before interacting with it.

CRITICAL RULES:
- Token MUST implement ERC20 standard interface (name(), symbol(), decimals(), totalSupply())
- Some tokens may not implement optional methods like name() or symbol()
- Decimals are critical for proper amount formatting (6 for USDC, 18 for most)
- Total supply can be 0 for deflationary tokens or before minting
- Information is read-only, no gas cost (view function)

PARAMETERS:
- chain: EVM chain where token is deployed (required)
  * Token must be deployed on specified chain
  * Same token name may exist on multiple chains with different addresses
  * Chain-specific deployment addresses

- tokenAddress: ERC20 token contract address (required)
  * Format: 0x followed by 40 hex characters
  * Must be deployed contract with ERC20 interface
  * Examples: USDC, DAI, WETH, custom tokens

EXAMPLES:
✅ Get USDC info on Polygon:
  {chain: "polygon", tokenAddress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"}

✅ Get DAI info on Ethereum:
  {chain: "ethereum", tokenAddress: "0x6B175474E89094C44Da98b954EedeAC495271d0F"}

✅ Get custom token info on BSC:
  {chain: "bsc", tokenAddress: "0x..."}

❌ Invalid - native token (no contract):
  {chain: "polygon", tokenAddress: "0x0000000000000000000000000000000000000000"}

❌ Invalid - not an ERC20 token:
  {chain: "ethereum", tokenAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D"} // NFT contract

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating query success
• chain: Chain queried
• tokenAddress: Token contract address
• name: Token name (e.g., "USD Coin")
• symbol: Token symbol (e.g., "USDC")
• decimals: Number of decimals (6, 8, or 18 typically)
• totalSupply: Total token supply (raw units and formatted)
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Trying to get info for native tokens (ETH, POL don't have contracts)
- Using token address from wrong chain
- Not checking decimals before formatting amounts
- Assuming all tokens have 18 decimals (USDC has 6)
- Confusing token symbol with token name

USE CASES:
- Verify token authenticity before trading
- Get decimals for proper amount formatting
- Check total supply for tokenomics analysis
- Display token metadata in UI
- Validate token contract before approvals

DECIMALS IMPACT:
- 18 decimals: 1 token = 1000000000000000000 raw units
- 6 decimals: 1 token = 1000000 raw units (USDC, USDT)
- 8 decimals: 1 token = 100000000 raw units (WBTC)

OPTIONAL METHODS:
Some tokens may not implement name() or symbol():
- Fallback to "Unknown" if not implemented
- Core method decimals() is usually present
- totalSupply() is part of standard ERC20

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
                tokenAddress: {
                    type: 'string',
                    description: 'ERC20 token contract address (0x...)'
                }
            },
            required: ['chain', 'tokenAddress']
        }
    },
    {
        name: 'evm_transfer_token',
        description: `
Transfer ERC20 tokens from your wallet to another address on any EVM chain.

Executes the ERC20 transfer() method, broadcasting transaction to blockchain. Requires gas payment
in native token (ETH, POL, etc.) to execute. Amount is automatically converted to raw units using token decimals.

CRITICAL RULES:
- Requires gas in native token (check balance with evm_get_balance first)
- Amount is in human-readable units ("100" = 100 tokens, not raw units)
- Sender must have sufficient token balance (check with evm_get_token_balance)
- Transaction is irreversible once confirmed
- Recipient address must be valid (use evm_validate_address to check)
- Private key grants full control - NEVER share or log it

PARAMETERS:
- chain: EVM chain to execute transaction on (required)
  * Must have gas in native token on this chain
  * Token must be deployed on this specific chain
  * Gas costs vary by chain (see CHAIN_GUIDANCE)

- tokenAddress: ERC20 token contract address (required)
  * Format: 0x followed by 40 hex characters
  * Must be valid ERC20 contract on specified chain
  * Examples: USDC, USDT, DAI, WETH, custom tokens

- toAddress: Recipient address (required)
  * Format: 0x followed by 40 hex characters
  * Can be EOA (user wallet) or contract address
  * VERIFY CAREFULLY - transactions are irreversible

- amount: Amount to transfer in token units (required)
  * Human-readable format: "100" = 100 tokens
  * Automatically converted using token decimals
  * Examples: "100" (100 USDC), "0.5" (half token), "1000000"

- privateKey: Sender's private key (required, KEEP SECRET)
  * Format: 0x followed by 64 hex characters
  * Must be key for address that holds tokens
  * Never expose, share, or log this value

EXAMPLES:
✅ Transfer 100 USDC on Polygon (low gas):
  {chain: "polygon", tokenAddress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", toAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", amount: "100", privateKey: "0xac0974..."}

✅ Transfer 0.5 WETH on Arbitrum:
  {chain: "arbitrum", tokenAddress: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", toAddress: "0x...", amount: "0.5", privateKey: "0x..."}

✅ Transfer custom token on BSC:
  {chain: "bsc", tokenAddress: "0x...", toAddress: "0x...", amount: "1000", privateKey: "0x..."}

❌ Invalid - insufficient gas:
  {chain: "ethereum", ...} // No ETH for gas

❌ Invalid - insufficient token balance:
  {chain: "polygon", amount: "10000", ...} // Only have 100 USDC

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating transaction success
• chain: Chain where transaction executed
• transactionHash: Transaction hash (0x... - use to track on block explorer)
• from: Sender address (derived from privateKey)
• to: Recipient address
• tokenAddress: Token contract address
• amount: Amount transferred (formatted)
• gasUsed: Gas consumed by transaction
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Not checking sender has sufficient token balance first
- Forgetting to have native token (ETH/POL) for gas
- Using raw units instead of human-readable amount
- Wrong recipient address (DOUBLE CHECK - irreversible)
- Using token address from wrong chain
- Not waiting for transaction confirmation

USE CASES:
- Send tokens to another user or exchange
- Transfer tokens between your own wallets
- Pay for services or products with tokens
- Distribute tokens to multiple recipients
- Move tokens before depositing to DeFi protocol

TRANSACTION FLOW:
1. Check sender token balance (evm_get_token_balance)
2. Check sender has gas (evm_get_balance)
3. Estimate gas cost (evm_estimate_gas - optional)
4. Execute transfer (this tool)
5. Wait for confirmation (monitor transactionHash)

GAS REQUIREMENTS:
- Token transfer typically costs 50,000-65,000 gas
- Ethereum Sepolia: ~0.001-0.002 ETH
- Polygon: ~0.00005 POL (very cheap)
- BSC: ~0.0001 BNB
- Arbitrum/Base: ~0.0001 ETH

SECURITY NOTES:
- Verify recipient address carefully (no undo)
- Never transfer to zero address (0x0000...0000)
- Check token contract is legitimate
- Start with small test amount on unfamiliar chains
- Keep private keys secure and never share

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
                tokenAddress: {
                    type: 'string',
                    description: 'ERC20 token contract address (0x...)'
                },
                toAddress: {
                    type: 'string',
                    description: 'Recipient address (0x...)'
                },
                amount: {
                    type: 'string',
                    description: 'Amount to transfer (in token units, e.g., "100" for 100 tokens)'
                },
                privateKey: {
                    type: 'string',
                    description: 'Sender private key (0x...)'
                }
            },
            required: ['chain', 'tokenAddress', 'toAddress', 'amount', 'privateKey']
        }
    },
    {
        name: 'evm_approve_token',
        description: `
Approve ERC20 token spending allowance for a spender address (DEX, lending protocol, or other contract).

Grants permission for another address to spend your tokens on your behalf. Required before using DeFi protocols,
DEX swaps, or any contract interaction that needs to transfer your tokens. Does NOT transfer tokens immediately.

CRITICAL RULES:
- Approval does NOT transfer tokens - only grants permission
- Required before DEX swaps, staking, lending, or any DeFi operations
- "unlimited" approval is convenient but risky (allows spender to take all tokens)
- Approval is per-token, per-spender, per-chain (must approve separately for each)
- Can be revoked by approving amount "0"
- Requires gas payment in native token

PARAMETERS:
- chain: EVM chain to execute approval on (required)
  * Approval is chain-specific
  * Must have gas in native token on this chain
  * Token and spender must exist on same chain

- tokenAddress: ERC20 token contract to approve (required)
  * Format: 0x followed by 40 hex characters
  * Token you want to allow spender to transfer
  * Examples: USDC, USDT, DAI, WETH

- spenderAddress: Address receiving approval (required)
  * Typically a smart contract (DEX router, lending pool)
  * Format: 0x followed by 40 hex characters
  * Examples: Uniswap Router, Aave Pool, custom contract
  * VERIFY THIS ADDRESS - malicious spenders can steal tokens

- amount: Approval amount (required)
  * Human-readable format: "100" = 100 tokens
  * Use "unlimited" or "max" for maximum approval (2^256-1)
  * Use "0" to revoke existing approval
  * Best practice: approve only amount needed

- privateKey: Token owner's private key (required, KEEP SECRET)
  * Format: 0x followed by 64 hex characters
  * Must be key for address holding tokens
  * Never expose, share, or log this value

EXAMPLES:
✅ Approve 100 USDC for Uniswap on Polygon:
  {chain: "polygon", tokenAddress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", spenderAddress: "0xE592427A0AEce92De3Edee1F18E0157C05861564", amount: "100", privateKey: "0xac0974..."}

✅ Approve unlimited WETH for DEX (convenient but risky):
  {chain: "arbitrum", tokenAddress: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", spenderAddress: "0x...", amount: "unlimited", privateKey: "0x..."}

✅ Revoke approval (security best practice):
  {chain: "bsc", tokenAddress: "0x...", spenderAddress: "0x...", amount: "0", privateKey: "0x..."}

❌ Invalid - approving EOA instead of contract:
  {chain: "polygon", spenderAddress: "0xPersonalWallet..."} // Personal wallets don't need approval

❌ Invalid - wrong chain for spender:
  {chain: "ethereum", spenderAddress: "0xPolygonOnlyRouter..."} // Spender not on Ethereum

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating approval success
• chain: Chain where approval executed
• transactionHash: Transaction hash for approval
• tokenAddress: Token contract approved
• spenderAddress: Address granted spending permission
• amount: Amount approved (formatted)
• owner: Token owner address (from privateKey)
• gasUsed: Gas consumed by transaction
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Forgetting to approve before attempting DEX swap (will fail)
- Approving personal wallet addresses (unnecessary)
- Not revoking old approvals to unused contracts (security risk)
- Approving wrong token or wrong spender
- Unlimited approval to unaudited contracts (dangerous)
- Not checking approval succeeded before next operation

USE CASES:
- Enable DEX token swaps (approve router to spend token A)
- Deposit tokens to lending protocols (approve pool contract)
- Stake tokens in farming contracts (approve staking contract)
- Bridge tokens across chains (approve bridge contract)
- Interact with any DeFi protocol requiring token transfers

APPROVAL WORKFLOW:
1. Identify spender address (DEX router, lending pool, etc.)
2. Approve token for spender (this tool)
3. Wait for approval transaction confirmation
4. Execute main operation (swap, stake, lend)
5. Optionally revoke approval after operation (security)

SECURITY CONSIDERATIONS:
- Unlimited approvals are convenient but dangerous
- Malicious contracts can drain approved tokens
- Approve only verified, audited contracts
- Revoke unused approvals periodically
- Use exact amounts when possible (not unlimited)
- Check spender address multiple times before approving

GAS COSTS:
- Approval typically costs 45,000-50,000 gas
- Ethereum Sepolia: ~0.001 ETH
- Polygon: ~0.00005 POL (very cheap)
- BSC: ~0.0001 BNB
- Arbitrum/Base: ~0.0001 ETH

CHECKING EXISTING APPROVALS:
Use evm_get_token_allowance to check current approval amount before approving again.

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
                tokenAddress: {
                    type: 'string',
                    description: 'ERC20 token contract address (0x...)'
                },
                spenderAddress: {
                    type: 'string',
                    description: 'Spender address to approve (0x...)'
                },
                amount: {
                    type: 'string',
                    description: 'Approval amount (use "unlimited" for max approval)'
                },
                privateKey: {
                    type: 'string',
                    description: 'Token owner private key (0x...)'
                }
            },
            required: ['chain', 'tokenAddress', 'spenderAddress', 'amount', 'privateKey']
        }
    },
    {
        name: 'evm_get_token_allowance',
        description: `
Check ERC20 token spending allowance currently granted from owner to spender.

Returns the amount of tokens a spender is currently allowed to transfer on behalf of the owner.
Used to verify approvals before DeFi operations and check if re-approval is needed.

CRITICAL RULES:
- Returns current allowance amount (may be 0 if not approved)
- Allowance decreases as spender uses it (check before each operation)
- Allowance of 0 means no approval exists
- Very large number (2^256-1) indicates unlimited approval
- Read-only operation, no gas cost

PARAMETERS:
- chain: EVM chain to query (required)
  * Allowances are chain-specific
  * Same owner/spender may have different allowances per chain

- tokenAddress: ERC20 token contract address (required)
  * Format: 0x followed by 40 hex characters
  * Allowances are per-token
  * Examples: USDC, USDT, DAI, WETH

- ownerAddress: Token owner address (required)
  * Address that granted the approval
  * Format: 0x followed by 40 hex characters
  * Must be address holding the tokens

- spenderAddress: Spender address (required)
  * Address that can spend the tokens
  * Typically a smart contract (DEX, lending pool)
  * Format: 0x followed by 40 hex characters

EXAMPLES:
✅ Check USDC allowance for Uniswap on Polygon:
  {chain: "polygon", tokenAddress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", ownerAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", spenderAddress: "0xE592427A0AEce92De3Edee1F18E0157C05861564"}

✅ Check allowance before DEX swap:
  {chain: "arbitrum", tokenAddress: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", ownerAddress: "0x...", spenderAddress: "0xRouterAddress"}

✅ Verify approval was successful:
  {chain: "bsc", tokenAddress: "0x...", ownerAddress: "0x...", spenderAddress: "0x..."}

❌ Invalid - swapped owner and spender:
  {ownerAddress: "0xContractAddress", spenderAddress: "0xUserWallet"} // Backwards

❌ Invalid - wrong chain:
  {chain: "ethereum", tokenAddress: "0xPolygonUSDC..."} // Token not on Ethereum

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating query success
• chain: Chain queried
• tokenAddress: Token contract checked
• ownerAddress: Token owner
• spenderAddress: Approved spender
• allowance: Object with raw (string) and formatted (string) values
• decimals: Token decimals used for formatting
• isUnlimited: Boolean indicating if allowance is max uint256
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Confusing owner and spender parameters (easy to swap)
- Not checking allowance before assuming approval exists
- Forgetting allowance decreases as it's spent
- Not accounting for decimals when interpreting raw value
- Assuming non-zero allowance means sufficient for operation

USE CASES:
- Check if approval needed before DEX swap
- Verify approval transaction succeeded
- Monitor remaining allowance after partial usage
- Audit approved spenders for security
- Determine if re-approval required

ALLOWANCE LIFECYCLE:
1. Initially 0 (no approval)
2. Increased by evm_approve_token
3. Decreased as spender transfers tokens
4. Can be set back to 0 (revoke approval)
5. Can be increased again (re-approve)

INTERPRETATION:
- allowance = 0: No approval, must call evm_approve_token
- allowance < needed: Insufficient, need to approve more
- allowance ≥ needed: Sufficient, can proceed with operation
- allowance = 2^256-1: Unlimited approval (never decreases)

SECURITY AUDITING:
Check all your token allowances periodically:
1. Query allowance for each token you hold
2. Identify unknown or unused spender contracts
3. Revoke suspicious or old approvals (approve amount "0")

BEFORE DEX SWAP:
Always check allowance before attempting swap:
1. Check allowance (this tool)
2. If insufficient, approve tokens (evm_approve_token)
3. Execute swap (evm_execute_swap)

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
                tokenAddress: {
                    type: 'string',
                    description: 'ERC20 token contract address (0x...)'
                },
                ownerAddress: {
                    type: 'string',
                    description: 'Token owner address (0x...)'
                },
                spenderAddress: {
                    type: 'string',
                    description: 'Spender address (0x...)'
                }
            },
            required: ['chain', 'tokenAddress', 'ownerAddress', 'spenderAddress']
        }
    },
    {
        name: 'evm_deploy_token',
        description: `
Deploy a new ERC20 token contract with customizable name and symbol to any EVM chain.

Creates and deploys a gas-optimized ERC20 token contract with YOUR chosen name and symbol.
Decimals fixed at 18 (standard). Deployer address becomes the initial token holder. Requires significant gas for contract deployment.

CRITICAL RULES:
- Contract deployment requires MORE gas than regular transactions (200,000-500,000 gas)
- Deployer address receives all initial supply tokens
- Token contract address is deterministic (based on deployer address + nonce)
- Once deployed, contract code is immutable on blockchain
- Name and symbol cannot be changed after deployment
- Decimals hardcoded to 18 for gas efficiency and standardization
- Implementation is minimal but fully functional and tested

PARAMETERS:
- chain: EVM chain to deploy token on (required)
  * Deployment gas costs vary significantly by chain
  * Ethereum: Very expensive (~$50-100 at peak)
  * Polygon/BSC: Cheap ($0.10-0.50)
  * Choose testnet chains for experimentation

- name: Token name (required)
  * Human-readable name (e.g., "My Project Token")
  * Displayed in wallets and explorers
  * Cannot be changed after deployment
  * Examples: "USD Coin", "Wrapped Ether", "My Token"

- symbol: Token ticker symbol (required)
  * Short identifier (typically 3-5 characters)
  * All caps by convention (e.g., "USDC", "WETH", "MTK")
  * Displayed in trading interfaces
  * Cannot be changed after deployment

- initialSupply: Initial token supply (required)
  * Decimals fixed at 18 (standard, same as ETH)
  * Human-readable format (e.g., "1000000" = 1 million tokens)
  * All tokens minted to deployer address
  * Consider tokenomics (total supply, inflation, etc.)
  * Example: "1000000000" (1 billion tokens)

- privateKey: Deployer's private key (required, KEEP SECRET)
  * Format: 0x followed by 64 hex characters
  * Must have sufficient native token for gas
  * Becomes contract deployer and initial token holder
  * Never expose, share, or log this value

EXAMPLES:
✅ Deploy custom token on Polygon testnet:
  {chain: "polygon", name: "Test USD Coin", symbol: "TUSDC", initialSupply: "1000000", privateKey: "0xac0974..."}

✅ Deploy project token on BSC testnet:
  {chain: "bsc", name: "My Project Token", symbol: "MPT", initialSupply: "1000000000", privateKey: "0x..."}

✅ Deploy on Arbitrum:
  {chain: "arbitrum", name: "Wrapped Test Bitcoin", symbol: "WTBTC", initialSupply: "21000000", privateKey: "0x..."}

❌ Invalid - insufficient gas:
  {chain: "ethereum", ...} // Need ~0.05 ETH for gas

❌ Invalid - symbol too long:
  {symbol: "MYLONGTOKEN"} // Keep under 5 chars

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating deployment success
• chain: Chain where token deployed
• deployment.transactionHash: Deployment transaction hash
• deployment.tokenAddress: New token contract address
• deployment.deployer: Deployer address (from privateKey)
• token.name: Token name (verified from contract)
• token.symbol: Token symbol (verified)
• token.decimals: Always 18 (hardcoded)
• token.totalSupply: Initial supply (formatted)
• verification.allChecks: Boolean confirming deployment matches parameters
• gasUsed: Gas consumed (usually 150,000-300,000)
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Not having enough gas for deployment (check balance first with evm_get_balance)
- Using mainnet for testing (ALWAYS use testnet chains)
- Not saving token contract address (critical for all future token operations)
- Typos in name/symbol (cannot change after deployment - double check!)
- Forgetting decimals are fixed at 18 (adjust accounting if needed)

USE CASES:
- Launch new cryptocurrency or token
- Create project governance token
- Deploy loyalty or reward points system
- Test token economics on testnet
- Create wrapped/synthetic assets

DEPLOYMENT GAS COSTS (approximate):
- Ethereum Sepolia: ~0.005-0.01 ETH (testnet)
- Polygon Amoy: ~0.001 POL (very cheap)
- BSC Testnet: ~0.002 BNB
- Arbitrum Sepolia: ~0.001 ETH
- Avalanche Fuji: ~0.002 AVAX

POST-DEPLOYMENT STEPS:
1. Save token contract address (critical!)
2. Verify contract on block explorer (optional but recommended)
3. Add token to wallet (import using contract address)
4. Distribute tokens to users (evm_transfer_token)
5. Set up liquidity if needed (DEX operations)

SECURITY NOTES:
- Test on testnet first before mainnet deployment
- Verify token name/symbol/decimals before deploying
- Ensure sufficient gas (deployment costs more than transfers)
- Contract code is immutable - cannot fix bugs after deployment
- Consider adding pausable/mintable features (requires custom contract)

LIMITATIONS:
- Decimals fixed at 18 (cannot be customized)
- No advanced features (additional minting, burning, pausing)
- Basic ERC20 implementation (standard transfer/approve/allowance)
- Not audited - recommended for testnet use only
- Gas-optimized minimal bytecode for lower deployment costs

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: {
                    type: 'string',
                    enum: SUPPORTED_CHAINS,
                    description: 'EVM chain to deploy on'
                },
                name: {
                    type: 'string',
                    description: 'Token name (e.g., "My Token")'
                },
                symbol: {
                    type: 'string',
                    description: 'Token symbol (e.g., "MTK")'
                },
                initialSupply: {
                    type: 'string',
                    description: 'Initial token supply (decimals fixed at 18)'
                },
                privateKey: {
                    type: 'string',
                    description: 'Deployer private key (0x...)'
                },
                mintable: {
                    type: 'boolean',
                    description: 'Deploy mintable/burnable token using OpenZeppelin (default: false)'
                }
            },
            required: ['chain', 'name', 'symbol', 'initialSupply', 'privateKey']
        }
    },
    {
        name: 'evm_mint_token',
        description: `
Mint (create) additional tokens and add them to circulation (requires minter role on token contract).

Creates new tokens from nothing and sends them to specified address, increasing total supply.
Only works if token contract implements minting functionality and caller has minter privileges.

CRITICAL RULES:
- Token contract MUST support minting (not all ERC20 tokens do)
- Caller MUST have minter role or be contract owner
- Increases total token supply (inflationary)
- Transaction is irreversible once confirmed
- Most standard tokens (USDC, USDT) do NOT allow public minting
- Works mainly with custom tokens you deployed

PARAMETERS:
- chain: EVM chain where token is deployed (required)
  * Token must support minting on this chain
  * Requires gas payment in native token

- tokenAddress: Mintable token contract address (required)
  * Format: 0x followed by 40 hex characters
  * Must be token with mint() function
  * Typically tokens you deployed yourself
  * Public tokens (USDC, DAI) don't allow minting

- toAddress: Recipient address for minted tokens (required)
  * Format: 0x followed by 40 hex characters
  * Can be any address (EOA or contract)
  * Often the minter's own address

- amount: Amount to mint in token units (required)
  * Human-readable format: "1000" = 1000 tokens
  * Automatically converted using token decimals
  * No upper limit (careful with tokenomics)
  * Examples: "1000000", "100.5", "50"

- privateKey: Minter's private key (required, KEEP SECRET)
  * Format: 0x followed by 64 hex characters
  * Must be address with MINTER_ROLE or owner
  * Usually contract deployer has this role
  * Never expose, share, or log this value

EXAMPLES:
✅ Mint 1000 tokens to your address (Polygon):
  {chain: "polygon", tokenAddress: "0xYourToken...", toAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", amount: "1000", privateKey: "0xac0974..."}

✅ Mint tokens for airdrop (BSC):
  {chain: "bsc", tokenAddress: "0x...", toAddress: "0xRecipient...", amount: "500", privateKey: "0x..."}

✅ Mint small amount for testing (Arbitrum):
  {chain: "arbitrum", tokenAddress: "0x...", toAddress: "0x...", amount: "10", privateKey: "0x..."}

❌ Invalid - no minter role:
  {privateKey: "0xRandomUser..."} // Not authorized

❌ Invalid - standard token doesn't support minting:
  {tokenAddress: "0xUSDC..."} // USDC doesn't allow public minting

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating minting success
• chain: Chain where minting occurred
• transactionHash: Mint transaction hash
• tokenAddress: Token contract address
• toAddress: Recipient of minted tokens
• amount: Amount minted (formatted)
• minter: Minter address (from privateKey)
• newTotalSupply: Updated total supply after minting
• gasUsed: Gas consumed by transaction
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Trying to mint tokens you didn't deploy (access denied)
- Not having minter role (transaction will fail)
- Minting on wrong chain (token not deployed there)
- Over-minting and destroying tokenomics
- Not considering impact on token price (inflation)

USE CASES:
- Airdrop tokens to community members
- Reward program (mint tokens as rewards)
- Gradual token distribution (vesting schedules)
- Testing token functionality on testnet
- Adjust supply based on demand (algorithmic tokens)

MINTING MECHANICS:
1. Increases total supply by minted amount
2. Credits recipient address with new tokens
3. Dilutes existing token holders (inflation)
4. No maximum limit (except uint256 max)
5. Can be called multiple times

ACCESS CONTROL:
- Token contract must have implemented access control
- Common patterns:
  * Ownable: Only owner can mint
  * AccessControl: Addresses with MINTER_ROLE can mint
  * No access control: Anyone can mint (dangerous!)

TOKENOMICS IMPACT:
- Minting increases supply (inflationary)
- Can decrease token value if not managed
- Should align with tokenomics model
- Consider: emission schedule, max supply, utility

GAS COSTS:
- Similar to token transfers (~50,000-65,000 gas)
- Ethereum Sepolia: ~0.001-0.002 ETH
- Polygon: ~0.00005 POL (very cheap)
- BSC: ~0.0001 BNB
- Arbitrum/Base: ~0.0001 ETH

SECURITY NOTES:
- Protect minter private key carefully (can inflate supply)
- Consider time-locking minting functions
- Implement minting caps for safety
- Test on testnet before mainnet minting
- Monitor total supply after minting

CHECKING MINTER ROLE:
Before attempting to mint, verify you have permission:
1. Check if you're contract owner
2. Check if you have MINTER_ROLE (AccessControl pattern)
3. Attempt small test mint first

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
                tokenAddress: {
                    type: 'string',
                    description: 'ERC20 token contract address (0x...)'
                },
                toAddress: {
                    type: 'string',
                    description: 'Recipient address (0x...)'
                },
                amount: {
                    type: 'string',
                    description: 'Amount to mint (in token units)'
                },
                privateKey: {
                    type: 'string',
                    description: 'Minter private key (0x...)'
                }
            },
            required: ['chain', 'tokenAddress', 'toAddress', 'amount', 'privateKey']
        }
    },
    {
        name: 'evm_burn_token',
        description: `
Burn (destroy) tokens permanently, removing them from circulation and reducing total supply.

Destroys tokens from your balance, sending them to zero address or removing from supply entirely.
Deflationary mechanism used to reduce supply, increase scarcity, or implement tokenomics.

CRITICAL RULES:
- Token contract MUST support burning (not all ERC20 tokens do)
- Tokens are PERMANENTLY destroyed (cannot be recovered)
- Decreases total supply (deflationary)
- Caller must own the tokens being burned
- Transaction is irreversible once confirmed
- Typically increases remaining token value (reduced supply)

PARAMETERS:
- chain: EVM chain where token is deployed (required)
  * Token must support burning on this chain
  * Requires gas payment in native token

- tokenAddress: Burnable token contract address (required)
  * Format: 0x followed by 40 hex characters
  * Must be token with burn() function
  * Typically custom tokens or some DeFi tokens
  * Standard tokens (USDC, USDT) may not support burning

- amount: Amount to burn in token units (required)
  * Human-readable format: "100" = 100 tokens
  * Automatically converted using token decimals
  * Must have sufficient balance to burn
  * Examples: "1000", "50.5", "100000"

- privateKey: Token holder's private key (required, KEEP SECRET)
  * Format: 0x followed by 64 hex characters
  * Must be address holding tokens to burn
  * Must have sufficient token balance
  * Never expose, share, or log this value

EXAMPLES:
✅ Burn 100 tokens to increase scarcity (Polygon):
  {chain: "polygon", tokenAddress: "0xYourToken...", amount: "100", privateKey: "0xac0974..."}

✅ Burn tokens as part of buyback program (BSC):
  {chain: "bsc", tokenAddress: "0x...", amount: "10000", privateKey: "0x..."}

✅ Burn small amount for testing (Arbitrum):
  {chain: "arbitrum", tokenAddress: "0x...", amount: "1", privateKey: "0x..."}

❌ Invalid - insufficient balance:
  {amount: "1000000"} // Only have 100 tokens

❌ Invalid - token doesn't support burning:
  {tokenAddress: "0xUSDC..."} // USDC doesn't allow public burning

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating burn success
• chain: Chain where burning occurred
• transactionHash: Burn transaction hash
• tokenAddress: Token contract address
• amount: Amount burned (formatted)
• burner: Burner address (from privateKey)
• newTotalSupply: Updated total supply after burn
• remainingBalance: Your remaining token balance
• gasUsed: Gas consumed by transaction
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Trying to burn more tokens than you own
- Burning tokens that don't support burn function
- Not considering impact on tokenomics
- Burning on wrong chain (token not deployed there)
- Accidentally burning too much (cannot undo)

USE CASES:
- Deflationary tokenomics (reduce supply over time)
- Buyback and burn programs (increase token value)
- Remove mistakenly minted tokens
- Implement fee burning mechanism
- Liquidity removal (burn LP tokens)
- Reward token burns for staking
- Automatic burning from transaction fees

BURN MECHANICS:
1. Permanently removes tokens from circulation
2. Reduces total supply (deflationary)
3. Cannot be reversed or recovered
4. Typically increases token scarcity and value
5. Updates all balance calculations

TOKENOMICS IMPACT:
- Decreases total supply (deflationary)
- Can increase remaining token value
- Should align with economic model
- Consider: burn rate, utility, scarcity

GAS COSTS:
- Similar to token transfers (~50,000-65,000 gas)
- Ethereum Sepolia: ~0.001-0.002 ETH
- Polygon: ~0.00005 POL (very cheap)
- BSC: ~0.0001 BNB
- Arbitrum/Base: ~0.0001 ETH

SECURITY NOTES:
- Cannot undo burn operations (permanent)
- Verify amount before burning (double-check)
- Test with small amounts first
- Consider implementing burn caps
- Monitor total supply after burns

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
                tokenAddress: {
                    type: 'string',
                    description: 'ERC20 token contract address (0x...)'
                },
                amount: {
                    type: 'string',
                    description: 'Amount to burn (in token units)'
                },
                privateKey: {
                    type: 'string',
                    description: 'Token holder private key (0x...)'
                }
            },
            required: ['chain', 'tokenAddress', 'amount', 'privateKey']
        }
    }
];
