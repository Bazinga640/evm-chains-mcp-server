import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { OS_GUIDANCE, CHAIN_GUIDANCE, SUPPORTED_CHAINS } from '../constants/guidance.js';

export const DEFI_TOOLS: Tool[] = [
    {
        name: 'evm_get_dex_quote',
        description: `
Get estimated swap output amount from DEX without executing the transaction.

Queries DEX router contract to calculate how many output tokens you'd receive for input amount.
Essential for price discovery, slippage calculation, and comparing rates across DEXs. No gas cost.

CRITICAL RULES:
- Read-only operation, no transaction executed
- Actual swap may differ due to price movement (use slippage protection)
- Quote valid only at current block (check immediately before swap)
- Accounts for DEX fees (typically 0.3%)
- Path finding automatic for direct pairs

PARAMETERS:
- chain: EVM chain where DEX operates (required)
  * Each chain has different DEX deployments
  * Popular: Uniswap (Ethereum), QuickSwap (Polygon), PancakeSwap (BSC)

- dex: DEX protocol name (required)
  * Supported: "uniswap", "quickswap", "traderjoe", "pancakeswap", "sushiswap"
  * Protocol must be deployed on selected chain
  * Case-insensitive

- tokenIn: Input token contract address (required)
  * Token you're selling/swapping from
  * Format: 0x followed by 40 hex characters
  * Must have liquidity with tokenOut

- tokenOut: Output token contract address (required)
  * Token you're buying/swapping to
  * Format: 0x followed by 40 hex characters
  * Must have liquidity with tokenIn

- amountIn: Input token amount (required)
  * Human-readable format: "1.0" = 1 token
  * Automatically converted using token decimals
  * Examples: "1.0", "100", "0.5"

EXAMPLES:
✅ Get quote for swapping 100 USDC to WETH on Polygon QuickSwap:
  {chain: "polygon", dex: "quickswap", tokenIn: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", tokenOut: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", amountIn: "100"}

✅ Check 1 ETH to USDC rate on Ethereum Uniswap:
  {chain: "ethereum", dex: "uniswap", tokenIn: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", tokenOut: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", amountIn: "1.0"}

✅ BSC PancakeSwap BNB to BUSD quote:
  {chain: "bsc", dex: "pancakeswap", tokenIn: "0xWBNB...", tokenOut: "0xBUSD...", amountIn: "0.5"}

❌ Invalid - DEX not on chain:
  {chain: "polygon", dex: "pancakeswap"} // PancakeSwap is BSC-only

❌ Invalid - no liquidity pair:
  {tokenIn: "0xToken1", tokenOut: "0xUnknownToken"} // Pair doesn't exist

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating quote success
• chain: Chain queried
• dex: DEX protocol
• tokenIn: Input token address
• tokenOut: Output token address
• amountIn: Input amount (formatted)
• amountOut: Expected output amount (formatted)
• priceImpact: Percentage price impact of swap
• route: Token path (direct or multi-hop)
• fee: DEX fee percentage (usually 0.3%)
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Not checking quote before every swap (price changes)
- Assuming quote equals actual output (use slippage tolerance)
- Using wrong DEX for chain
- Not accounting for price impact on large swaps
- Forgetting DEX fees reduce output

USE CASES:
- Check swap rates before executing
- Compare prices across multiple DEXs
- Calculate slippage tolerance needed
- Monitor token prices
- Build arbitrage bots

PRICE IMPACT:
Large swaps affect price:
- Small trades (<1% of liquidity): Low impact
- Medium trades (1-5%): Moderate impact
- Large trades (>5%): High impact, consider splitting
- Impact shown in quote output

SLIPPAGE CALCULATION:
Use quote to set slippage:
1. Get quote output amount
2. Decide acceptable slippage (0.5%, 1%, 5%)
3. Calculate minimum output: quote * (1 - slippage/100)
4. Use in evm_execute_swap

DEX FEES:
Standard DEX fees:
- Uniswap V2: 0.3%
- Uniswap V3: 0.05%, 0.3%, or 1% (tier-based)
- PancakeSwap: 0.25%
- QuickSwap: 0.3%
- Fees deducted from output

MULTI-HOP ROUTING:
If no direct pair exists:
- DEX finds optimal path through intermediate tokens
- Example: TokenA → WETH → TokenB
- More hops = more fees
- Route shown in output

DEX BY CHAIN:
- Ethereum: Uniswap, SushiSwap
- Polygon: QuickSwap, SushiSwap, Uniswap V3
- BSC: PancakeSwap, BiSwap
- Arbitrum: Uniswap V3, Camelot, SushiSwap
- Avalanche: Trader Joe, Pangolin
- Base: Uniswap V3, BaseSwap

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
                dex: {
                    type: 'string',
                    description: 'DEX name (e.g., "uniswap", "quickswap", "traderjoe", "pancakeswap")'
                },
                tokenIn: {
                    type: 'string',
                    description: 'Input token address (0x...)'
                },
                tokenOut: {
                    type: 'string',
                    description: 'Output token address (0x...)'
                },
                amountIn: {
                    type: 'string',
                    description: 'Input amount (in ether units, e.g., "1.0")'
                }
            },
            required: ['chain', 'dex', 'tokenIn', 'tokenOut', 'amountIn']
        }
    },
    {
        name: 'evm_execute_swap',
        description: `
Execute token swap on DEX with automatic slippage protection and deadline.

Broadcasts swap transaction to DEX router. Requires prior token approval. Protects against price
movement with slippage tolerance. Transaction fails if output below minimum acceptable amount.

CRITICAL RULES:
- MUST approve tokenIn for DEX router BEFORE swapping (use evm_approve_token)
- Requires gas in native token (ETH, POL, etc.)
- Slippage protection prevents unfavorable execution
- Transaction has deadline (typically 20 minutes)
- Actual output may be less than quote due to price movement
- Irreversible once confirmed

PARAMETERS:
- chain: EVM chain to execute swap on (required)
  * Must have gas in native token
  * Different gas costs per chain

- dex: DEX protocol name (required)
  * Must be deployed on selected chain
  * Examples: "uniswap", "quickswap", "pancakeswap"

- tokenIn: Input token to swap from (required)
  * Token you're selling
  * Must approve this token for router first
  * Format: 0x followed by 40 hex characters

- tokenOut: Output token to receive (required)
  * Token you're buying
  * Format: 0x followed by 40 hex characters
  * Must have liquidity pair with tokenIn

- amountIn: Amount to swap (required)
  * Human-readable format: "100" = 100 tokens
  * Must have sufficient balance
  * Examples: "1.0", "100", "0.5"

- slippageTolerance: Maximum price slippage (required)
  * Percentage as decimal: "0.5" = 0.5%
  * Common values: "0.5" (low), "1" (medium), "5" (high)
  * Higher slippage = more likely to succeed but worse price
  * Lower slippage = better price but may fail

- privateKey: Transaction signer's private key (required, KEEP SECRET)
  * Must be address holding tokenIn
  * Must have gas for transaction
  * Never expose, share, or log

EXAMPLES:
✅ Swap 100 USDC to WETH on Polygon with 0.5% slippage:
  {chain: "polygon", dex: "quickswap", tokenIn: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", tokenOut: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", amountIn: "100", slippageTolerance: "0.5", privateKey: "0xac0974..."}

✅ Swap 1 ETH to USDC on Ethereum with 1% slippage:
  {chain: "ethereum", dex: "uniswap", tokenIn: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", tokenOut: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", amountIn: "1.0", slippageTolerance: "1", privateKey: "0x..."}

✅ High slippage for volatile tokens (BSC):
  {chain: "bsc", dex: "pancakeswap", tokenIn: "0xToken...", tokenOut: "0xBUSD...", amountIn: "50", slippageTolerance: "5", privateKey: "0x..."}

❌ Invalid - no token approval:
  {amountIn: "100"} // Must approve tokenIn first

❌ Invalid - insufficient balance:
  {amountIn: "10000"} // Only have 100 tokens

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating swap success
• chain: Chain where swap executed
• transactionHash: Transaction hash for tracking
• dex: DEX protocol used
• tokenIn: Input token address
• tokenOut: Output token address
• amountIn: Amount swapped (formatted)
• amountOut: Amount received (formatted)
• priceImpact: Actual price impact percentage
• gasUsed: Gas consumed
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Forgetting to approve tokens before swap (will fail)
- Insufficient gas for transaction
- Slippage too low (transaction fails)
- Not checking quote before swap
- Swapping during high volatility (large slippage)

USE CASES:
- Trade tokens for different tokens
- Rebalance portfolio
- Take profits or cut losses
- Arbitrage between chains
- Convert tokens for DeFi operations

PRE-SWAP CHECKLIST:
1. Check tokenIn balance (evm_get_token_balance)
2. Check gas balance (evm_get_balance)
3. Get quote (evm_get_dex_quote)
4. Approve tokenIn for router (evm_approve_token)
5. Execute swap (this tool)

SLIPPAGE TOLERANCE GUIDE:
- 0.1-0.5%: Stable pairs (USDC/USDT), low volatility
- 0.5-1%: Normal conditions, major tokens
- 1-3%: Moderate volatility, medium liquidity
- 3-5%: High volatility, low liquidity
- 5%+: Extreme volatility or very low liquidity

TRANSACTION FLOW:
1. Get quote for amountOut estimate
2. Calculate minAmountOut = quote * (1 - slippage/100)
3. Approve tokenIn if needed
4. Execute swap with slippage protection
5. Transaction reverts if output < minAmountOut
6. Deadline prevents pending transactions

GAS COSTS:
- Simple swap (direct pair): 150,000-200,000 gas
- Multi-hop swap: 250,000-350,000 gas
- Ethereum Sepolia: ~0.003-0.005 ETH
- Polygon: ~0.0001 POL
- BSC: ~0.0003 BNB

PRICE IMPACT:
Large swaps move price:
- Monitor priceImpact in output
- Consider splitting large orders
- Check liquidity before swapping
- Higher impact = worse execution price

FAILED TRANSACTIONS:
Common failure reasons:
- Insufficient approval
- Slippage exceeded
- Deadline passed
- Insufficient liquidity
- Transaction reverted

SECURITY NOTES:
- Verify token addresses carefully
- Check DEX router address is official
- Start with small test swaps
- Monitor transaction on explorer
- Beware of fake tokens with similar names

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
                dex: {
                    type: 'string',
                    description: 'DEX name (e.g., "uniswap", "quickswap", "traderjoe", "pancakeswap")'
                },
                tokenIn: {
                    type: 'string',
                    description: 'Input token address (0x...)'
                },
                tokenOut: {
                    type: 'string',
                    description: 'Output token address (0x...)'
                },
                amountIn: {
                    type: 'string',
                    description: 'Input amount (in ether units, e.g., "1.0")'
                },
                slippageTolerance: {
                    type: 'string',
                    description: 'Slippage tolerance percentage (e.g., "0.5" for 0.5%)'
                },
                privateKey: {
                    type: 'string',
                    description: 'Private key to sign transaction (0x...)'
                }
            },
            required: ['chain', 'dex', 'tokenIn', 'tokenOut', 'amountIn', 'slippageTolerance', 'privateKey']
        }
    },
    {
        name: 'evm_get_pool_info',
        description: `
Get liquidity pool information including reserves, price, and LP token details.

Queries DEX pair contract for current pool state. Shows token reserves, exchange rate, total liquidity,
and LP token address. Essential before adding/removing liquidity or analyzing pool health. No gas cost.

CRITICAL RULES:
- Read-only operation, no transaction
- Pool must exist (tokens must have been paired)
- Reserves change with every swap
- Price calculated from reserve ratio
- LP token represents share of pool

PARAMETERS:
- chain: EVM chain where pool exists (required)
- dex: DEX protocol name (required)
- tokenA: First token in pair (required)
- tokenB: Second token in pair (required)

EXAMPLES:
✅ Get USDC/WETH pool on Polygon QuickSwap:
  {chain: "polygon", dex: "quickswap", tokenA: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", tokenB: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"}

OUTPUT:
• reserveA, reserveB: Token amounts in pool
• priceAtoB, priceBtoA: Exchange rates
• lpTokenAddress: LP token contract
• totalSupply: Total LP tokens
• share: Your pool ownership percentage

${CHAIN_GUIDANCE}
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
                dex: {
                    type: 'string',
                    description: 'DEX name (e.g., "uniswap", "quickswap", "traderjoe", "pancakeswap")'
                },
                tokenA: {
                    type: 'string',
                    description: 'First token address (0x...)'
                },
                tokenB: {
                    type: 'string',
                    description: 'Second token address (0x...)'
                }
            },
            required: ['chain', 'dex', 'tokenA', 'tokenB']
        }
    },
    {
        name: 'evm_add_liquidity',
        description: `
Add liquidity to DEX pool to earn trading fees from swaps. Requires both tokens, returns LP tokens.

CRITICAL RULES:
- MUST approve both tokenA and tokenB before adding liquidity
- Amounts must match pool price ratio (use evm_get_pool_info)
- Receives LP tokens representing pool share
- Earns fees proportional to share (typically 0.25-0.3%)
- Requires gas in native token

PARAMETERS:
- tokenA, tokenB: Token pair addresses (required)
- amountA, amountB: Token amounts matching pool ratio (required)
- slippageTolerance: Price change tolerance "0.5" = 0.5% (required)
- privateKey: Must hold both tokens and gas (required)

EXAMPLES:
✅ Add 100 USDC + equivalent WETH to Polygon QuickSwap:
  {chain: "polygon", dex: "quickswap", tokenA: "0x2791Bca...", tokenB: "0x7ceB23fD...", amountA: "100", amountB: "0.05", slippageTolerance: "0.5", privateKey: "0x..."}

WORKFLOW:
1. Get pool ratio (evm_get_pool_info)
2. Calculate matching amounts
3. Approve both tokens for router
4. Add liquidity (this tool)
5. Receive LP tokens

${CHAIN_GUIDANCE}
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
                dex: {
                    type: 'string',
                    description: 'DEX name (e.g., "uniswap", "quickswap", "traderjoe", "pancakeswap")'
                },
                tokenA: {
                    type: 'string',
                    description: 'First token address (0x...)'
                },
                tokenB: {
                    type: 'string',
                    description: 'Second token address (0x...)'
                },
                amountA: {
                    type: 'string',
                    description: 'Amount of first token (in ether units)'
                },
                amountB: {
                    type: 'string',
                    description: 'Amount of second token (in ether units)'
                },
                slippageTolerance: {
                    type: 'string',
                    description: 'Slippage tolerance percentage (e.g., "0.5" for 0.5%)'
                },
                privateKey: {
                    type: 'string',
                    description: 'Private key to sign transaction (0x...)'
                }
            },
            required: ['chain', 'dex', 'tokenA', 'tokenB', 'amountA', 'amountB', 'slippageTolerance', 'privateKey']
        }
    },
    {
        name: 'evm_remove_liquidity',
        description: `
Remove liquidity from DEX pool by burning LP tokens, retrieving both tokens proportionally.

CRITICAL RULES:
- Burns LP tokens, receives tokenA and tokenB
- Amounts proportional to pool share
- Must approve LP token for router
- Collected fees included in withdrawal
- Transaction irreversible

PARAMETERS:
- tokenA, tokenB: Original pair tokens (required)
- liquidityAmount: LP tokens to burn (required)
- slippageTolerance: "0.5" = 0.5% (required)
- privateKey: Must hold LP tokens (required)

EXAMPLES:
✅ Remove 50% liquidity from USDC/WETH pool:
  {chain: "polygon", dex: "quickswap", tokenA: "0x2791Bca...", tokenB: "0x7ceB23fD...", liquidityAmount: "5.0", slippageTolerance: "0.5", privateKey: "0x..."}

WORKFLOW:
1. Check LP token balance
2. Approve LP token for router
3. Remove liquidity (this tool)
4. Receive tokenA + tokenB

${CHAIN_GUIDANCE}
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
                dex: {
                    type: 'string',
                    description: 'DEX name (e.g., "uniswap", "quickswap", "traderjoe", "pancakeswap")'
                },
                tokenA: {
                    type: 'string',
                    description: 'First token address (0x...)'
                },
                tokenB: {
                    type: 'string',
                    description: 'Second token address (0x...)'
                },
                liquidityAmount: {
                    type: 'string',
                    description: 'Amount of LP tokens to burn (in ether units)'
                },
                slippageTolerance: {
                    type: 'string',
                    description: 'Slippage tolerance percentage (e.g., "0.5" for 0.5%)'
                },
                privateKey: {
                    type: 'string',
                    description: 'Private key to sign transaction (0x...)'
                }
            },
            required: ['chain', 'dex', 'tokenA', 'tokenB', 'liquidityAmount', 'slippageTolerance', 'privateKey']
        }
    },
    {
        name: 'evm_get_user_liquidity',
        description: `
Get user's liquidity positions across DEX pools (PLACEHOLDER - limited implementation).

Lists LP token balances and calculates underlying token amounts. Useful for portfolio tracking.

PARAMETERS:
- chain, address: Required
- dex: Optional filter

EXAMPLES:
✅ {chain: "polygon", address: "0x742d35..."}

NOTE: Placeholder tool - may return guidance instead of data.

${CHAIN_GUIDANCE}
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
                    description: 'User wallet address (0x...)'
                },
                dex: {
                    type: 'string',
                    description: 'Optional: DEX name to filter positions'
                }
            },
            required: ['chain', 'address']
        }
    },
    {
        name: 'evm_get_farming_rewards',
        description: `
Get farming/staking rewards for user (PLACEHOLDER - limited implementation).

Queries farm contracts for pending rewards. Useful for reward tracking before claiming.

PARAMETERS:
- chain, address: Required
- farmContract: Optional

EXAMPLES:
✅ {chain: "polygon", address: "0x742d35..."}

NOTE: Placeholder - implementation depends on farm contract standards.

${CHAIN_GUIDANCE}
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
                    description: 'User wallet address (0x...)'
                },
                farmContract: {
                    type: 'string',
                    description: 'Optional: Specific farm contract address (0x...)'
                }
            },
            required: ['chain', 'address']
        }
    },
    {
        name: 'evm_claim_farming_rewards',
        description: `
Claim farming/staking rewards from farm contract (PLACEHOLDER - limited implementation).

Executes claim transaction to receive earned rewards. Requires gas.

PARAMETERS:
- chain, farmContract, privateKey: Required

EXAMPLES:
✅ {chain: "polygon", farmContract: "0xFarm...", privateKey: "0x..."}

NOTE: Placeholder - farm contract must support claim function.

${CHAIN_GUIDANCE}
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
                farmContract: {
                    type: 'string',
                    description: 'Farm contract address (0x...)'
                },
                privateKey: {
                    type: 'string',
                    description: 'Private key to sign transaction (0x...)'
                }
            },
            required: ['chain', 'farmContract', 'privateKey']
        }
    }
];
