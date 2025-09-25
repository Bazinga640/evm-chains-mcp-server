import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { OS_GUIDANCE, CHAIN_GUIDANCE, SUPPORTED_CHAINS } from '../constants/guidance.js';

export const ANALYTICS_TOOLS: Tool[] = [
    {
        name: 'evm_get_account_analytics',
        description: `
Get comprehensive account analytics: transaction count, volume, activity patterns.

CRITICAL RULES:
- Read-only operation
- Default analysis: 30 days
- Requires transaction history
- May be rate-limited on public RPCs

PARAMETERS:
- chain: EVM chain (required)
- address: Account to analyze (required)
- days: Analysis period (optional, default: 30)

EXAMPLES:
✅ Analyze account activity: {chain: "ethereum", address: "0x742d35Cc..."}
✅ Last 7 days: {chain: "polygon", address: "0x742d35Cc...", days: 7}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• transactionCount: Total transactions
• volume: Total value transferred
• activityScore: Engagement metric
• patterns: Usage trends

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
                    description: 'Ethereum address (0x...)'
                },
                days: {
                    type: 'number',
                    description: 'Number of days to analyze (default: 30)'
                }
            },
            required: ['chain', 'address']
        }
    },
    {
        name: 'evm_get_portfolio_value',
        description: `
Calculate total portfolio value: native balance + ERC-20 tokens.

CRITICAL RULES:
- Read-only operation
- Requires price data for USD values
- Native token always included
- Optional token list for focus

PARAMETERS:
- chain: EVM chain (required)
- address: Wallet address (required)
- tokenAddresses: Specific tokens (optional)

EXAMPLES:
✅ Total portfolio: {chain: "ethereum", address: "0x742d35Cc..."}
✅ Specific tokens: {chain: "polygon", address: "0x742d35Cc...", tokenAddresses: ["0xToken1...", "0xToken2..."]}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• totalValue: Portfolio value (USD)
• nativeBalance: Native token amount
• tokenBalances: ERC-20 holdings
• prices: Current token prices

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
                    description: 'Ethereum address (0x...)'
                },
                tokenAddresses: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Optional: Array of ERC-20 token contract addresses to include'
                }
            },
            required: ['chain', 'address']
        }
    },
    {
        name: 'evm_get_transaction_analytics',
        description: `
Analyze transaction patterns: frequency, gas usage, and activity trends.

CRITICAL RULES:
- Read-only operation
- Default: 1000 recent blocks
- Computationally intensive
- Rate limits may apply

PARAMETERS:
- chain: EVM chain (required)
- address: Account to analyze (required)
- blockRange: Blocks to scan (optional, default: 1000)

EXAMPLES:
✅ Transaction patterns: {chain: "ethereum", address: "0x742d35Cc..."}
✅ Last 500 blocks: {chain: "polygon", address: "0x742d35Cc...", blockRange: 500}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• frequency: Transactions per day
• gasUsage: Average and total gas
• patterns: Peak activity times
• types: Contract vs transfer ratio

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
                    description: 'Ethereum address (0x...)'
                },
                blockRange: {
                    type: 'number',
                    description: 'Number of recent blocks to analyze (default: 1000)'
                }
            },
            required: ['chain', 'address']
        }
    },
    {
        name: 'evm_get_gas_analytics',
        description: `
Analyze gas usage: historical costs, trends, efficiency metrics.

CRITICAL RULES:
- Read-only operation
- Default: 30 day analysis
- Includes cost optimization suggestions
- Varies significantly by chain

PARAMETERS:
- chain: EVM chain (required)
- address: Account to analyze (required)
- days: Analysis period (optional, default: 30)

EXAMPLES:
✅ Gas spending analysis: {chain: "ethereum", address: "0x742d35Cc..."}
✅ Weekly review: {chain: "polygon", address: "0x742d35Cc...", days: 7}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• totalGasUsed: Total gas consumed
• totalCost: Native token spent
• averageGasPrice: Mean price paid
• efficiency: Optimization score

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
                    description: 'Ethereum address (0x...)'
                },
                days: {
                    type: 'number',
                    description: 'Number of days to analyze (default: 30)'
                }
            },
            required: ['chain', 'address']
        }
    },
    {
        name: 'evm_get_token_holdings_summary',
        description: `
Summary of token holdings: native + ERC-20 tokens with diversity metrics.

CRITICAL RULES:
- Read-only operation
- Native balance always included
- Zero balances excluded by default
- Portfolio diversity calculated

PARAMETERS:
- chain: EVM chain (required)
- address: Wallet address (required)
- tokenAddresses: Specific tokens (optional)
- includeZeroBalances: Show zero balances (optional, default: false)

EXAMPLES:
✅ All holdings: {chain: "ethereum", address: "0x742d35Cc..."}
✅ Specific tokens: {chain: "polygon", address: "0x742d35Cc...", tokenAddresses: ["0xToken1...", "0xToken2..."]}
✅ Include zeros: {chain: "bsc", address: "0x742d35Cc...", includeZeroBalances: true}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• nativeBalance: Native token amount
• tokenBalances: ERC-20 holdings array
• diversityScore: Portfolio diversity metric
• totalTokens: Number of unique tokens

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
                    description: 'Ethereum address (0x...)'
                },
                tokenAddresses: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Optional: Array of ERC-20 token contract addresses to check'
                },
                includeZeroBalances: {
                    type: 'boolean',
                    description: 'Optional: Include tokens with zero balance (default: false)'
                }
            },
            required: ['chain', 'address']
        }
    }
];
