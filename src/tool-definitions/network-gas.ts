import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { OS_GUIDANCE, CHAIN_GUIDANCE, SUPPORTED_CHAINS } from '../constants/guidance.js';

export const NETWORK_GAS_TOOLS: Tool[] = [
    {
        name: 'evm_get_network_info',
        description: `
Get comprehensive network health metrics including block info, gas prices, and utilization.

Aggregates real-time network data: latest block number, timestamp, gas prices (EIP-1559 breakdown),
and network congestion level. Essential for timing transactions and monitoring chain health.

CRITICAL RULES:
- Read-only operation (no gas cost)
- Data is current but may be 1-2 blocks behind
- Gas prices fluctuate rapidly
- Base fee adjusts every block (EIP-1559)
- Different chains have different block times

PARAMETERS:
- chain: EVM chain to query (required)
  * Each chain has unique characteristics
  * Block times vary: Ethereum ~12s, Polygon ~2s, Arbitrum ~0.25s

EXAMPLES:
✅ Check Ethereum network status:
  {chain: "ethereum"}

✅ Monitor Polygon for low-gas window:
  {chain: "polygon"}

✅ Verify Arbitrum is syncing:
  {chain: "arbitrum"}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• latestBlock: Current block number
• timestamp: Block timestamp (Unix)
• gasPrice: Current gas price (wei)
• baseFee: EIP-1559 base fee (wei)
• priorityFee: Suggested priority fee (wei)
• utilization: Network congestion (0-100%)
• chainId: Network chain ID

COMMON MISTAKES:
- Not accounting for block time differences across chains
- Assuming gas prices are stable (they change constantly)
- Ignoring utilization when timing transactions
- Using outdated data for transaction submission

USE CASES:
- Time transactions for low gas periods
- Monitor network congestion before operations
- Verify chain is syncing properly
- Display network health in UI
- Calculate optimal gas prices

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
        name: 'evm_get_gas_oracle',
        description: `
Get gas price recommendations with slow/standard/fast tiers for optimal transaction timing.

Provides three gas price options based on network conditions. Slow for low-priority transactions,
standard for typical operations, fast for urgent transactions. Uses EIP-1559 base + priority fee structure.

CRITICAL RULES:
- Read-only operation (no gas cost)
- Prices change every block
- Fast tier pays significant premium
- Slow tier may delay confirmation
- Base fee determined by network, not user
- Priority fee tips validators

PARAMETERS:
- chain: EVM chain to query (required)
  * Gas prices vary dramatically by chain
  * Ethereum: High gas (10-100+ gwei)
  * Polygon: Low gas (30-50 gwei)
  * Arbitrum: Very low gas (<1 gwei)

EXAMPLES:
✅ Get Ethereum gas tiers for transaction:
  {chain: "ethereum"}

✅ Check Polygon gas for batch operation:
  {chain: "polygon"}

✅ Find cheap gas window on BSC:
  {chain: "bsc"}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• slow: {baseFee, priorityFee, total, estimatedTime}
• standard: {baseFee, priorityFee, total, estimatedTime}
• fast: {baseFee, priorityFee, total, estimatedTime}
• timestamp: When prices were fetched

COMMON MISTAKES:
- Using fast tier for non-urgent transactions (overpaying)
- Using slow tier for time-sensitive operations
- Not refreshing prices before submission
- Ignoring base fee (it's required, not optional)
- Comparing prices across different chains

USE CASES:
- Choose gas tier based on urgency
- Display price options to users
- Optimize transaction costs
- Schedule transactions for low gas periods
- Calculate total transaction cost estimates

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
        name: 'evm_estimate_fees',
        description: `
Estimate total transaction cost with detailed EIP-1559 breakdown.

Simulates transaction to estimate gas usage, then calculates cost using current gas prices. Returns
detailed breakdown: gas limit, base fee, priority fee, and total cost in native token and USD.

CRITICAL RULES:
- Estimation may differ from actual (contract state changes)
- Read-only operation (no gas cost)
- Includes safety margin in gas limit
- Requires sender to have sufficient balance
- Complex contract calls need 'data' parameter
- Value must be in ether units

PARAMETERS:
- chain: EVM chain to estimate on (required)
  * Each chain has different gas costs

- from: Sender address (required)
  * Must have balance for value transfer
  * Format: "0x..." (42 characters)

- to: Recipient address (required)
  * EOA for transfers, contract for calls
  * Format: "0x..." (42 characters)

- value: Amount to send (optional)
  * In ether units (e.g., "1.5")
  * Omit for contract calls without value

- data: Transaction data (optional)
  * For contract interactions
  * Format: "0x..." (hex encoded)

EXAMPLES:
✅ Estimate simple ETH transfer:
  {chain: "ethereum", from: "0x742d35Cc...", to: "0x8626f6940...", value: "0.1"}

✅ Estimate token transfer cost:
  {chain: "polygon", from: "0x742d35Cc...", to: "0xTokenContract...", data: "0xa9059cbb..."}

✅ Estimate contract call with value:
  {chain: "bsc", from: "0x742d35Cc...", to: "0xContract...", value: "1.0", data: "0x12345678..."}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• gasLimit: Estimated gas units required
• baseFee: EIP-1559 base fee (wei)
• priorityFee: Suggested priority fee (wei)
• totalGasCost: Total in native token
• totalUSD: Estimated USD cost (if available)
• breakdown: Detailed cost components

COMMON MISTAKES:
- Not including data for contract interactions
- Using wei instead of ether for value
- Estimating with insufficient sender balance
- Forgetting to add buffer for gas fluctuations
- Not re-estimating before actual submission

USE CASES:
- Display transaction cost to users before signing
- Validate wallet has sufficient balance
- Compare costs across different chains
- Optimize contract interactions
- Budget for transaction fees

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: {
                    type: 'string',
                    enum: SUPPORTED_CHAINS,
                    description: 'EVM chain to estimate on'
                },
                from: {
                    type: 'string',
                    description: 'Sender address (0x...)'
                },
                to: {
                    type: 'string',
                    description: 'Recipient address (0x...)'
                },
                value: {
                    type: 'string',
                    description: 'Amount to send in ether (optional)'
                },
                data: {
                    type: 'string',
                    description: 'Transaction data (optional, 0x...)'
                }
            },
            required: ['chain', 'from', 'to']
        }
    },
    {
        name: 'evm_get_block_gas_limit',
        description: `
Get block gas limit and usage analysis for congestion detection.

CRITICAL RULES:
- Read-only operation
- Gas limit varies by chain
- High utilization = network congestion
- Limit determines max transactions per block

PARAMETERS:
- chain: EVM chain (required)
- blockCount: Blocks to analyze (optional, default: 6)

EXAMPLES:
✅ Check Ethereum capacity: {chain: "ethereum"}
✅ Analyze 10 blocks: {chain: "polygon", blockCount: 10}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• currentLimit: Block gas limit
• averageUsed: Average gas used
• utilization: Capacity percentage
• trend: Increasing/decreasing/stable

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
                blockCount: {
                    type: 'number',
                    description: 'Number of recent blocks to analyze (default: 6)'
                }
            },
            required: ['chain']
        }
    },
    {
        name: 'evm_get_base_fee',
        description: `
Get EIP-1559 base fee trends with historical analysis.

CRITICAL RULES:
- Read-only operation
- Base fee adjusts each block automatically
- Cannot be controlled by users
- Required for all EIP-1559 transactions
- Rises with congestion, falls when empty

PARAMETERS:
- chain: EVM chain (required)
- blockCount: Blocks for trend (optional, default: 6)

EXAMPLES:
✅ Check current base fee: {chain: "ethereum"}
✅ Analyze 20 block trend: {chain: "polygon", blockCount: 20}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• currentBaseFee: Latest base fee (wei)
• trend: Rising/falling/stable
• average: Historical average
• percentChange: Recent change percentage

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
                blockCount: {
                    type: 'number',
                    description: 'Number of recent blocks for trend analysis (default: 6)'
                }
            },
            required: ['chain']
        }
    },
    {
        name: 'evm_get_priority_fee',
        description: `
Get EIP-1559 priority fee recommendations with percentile-based tiers.

CRITICAL RULES:
- Read-only operation
- Priority fee tips validators/miners
- Optional but speeds confirmation
- Higher percentile = faster inclusion
- Zero priority fee possible but slow

PARAMETERS:
- chain: EVM chain (required)
- percentile: Fee tier (optional)
  * 25 = slow (budget)
  * 50 = standard (default)
  * 75 = fast
  * 95 = instant

EXAMPLES:
✅ Get standard priority: {chain: "ethereum"}
✅ Get fast confirmation: {chain: "polygon", percentile: 75}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• priorityFee: Recommended fee (wei)
• percentile: Selected tier
• estimatedTime: Confirmation time
• recentFees: Historical data

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
                percentile: {
                    type: 'number',
                    description: 'Fee percentile (25=slow, 50=standard, 75=fast, 95=instant, default: 50)'
                }
            },
            required: ['chain']
        }
    },
    {
        name: 'evm_resolve_ens',
        description: 'Resolve ENS (Ethereum Name Service) name to Ethereum address. Note: ENS is primarily on Ethereum mainnet, testnet support varies.',
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                ensName: { type: 'string', description: 'ENS name to resolve (e.g., vitalik.eth)' }
            },
            required: ['chain', 'ensName']
        }
    },
    {
        name: 'evm_lookup_address',
        description: 'Reverse resolve Ethereum address to ENS name (if configured). Note: ENS is primarily on Ethereum mainnet, testnet support varies.',
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                address: { type: 'string', description: 'Ethereum address to reverse resolve' }
            },
            required: ['chain', 'address']
        }
    }
];
