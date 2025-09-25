import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SUPPORTED_CHAINS } from '../constants/guidance.js';

export const MEV_ANALYSIS_TOOLS: Tool[] = [
    {
        name: 'evm_detect_sandwich',
        description: `
Detect MEV sandwich attacks in transactions or blocks.

Analyzes transactions for frontrunning patterns where attackers profit by sandwiching user trades.
Identifies sandwich bots, victims, and profit estimates.

PARAMETERS:
- chain: Target EVM chain
- transactionHash: Check if specific tx was sandwiched (optional)
- blockNumber: Analyze all sandwich attacks in block (optional)
- victimAddress: Check if address was victimized (optional)
- timeWindow: Number of recent blocks to analyze (default: 100)

DETECTION:
• Identifies frontrun + victim + backrun patterns
• Detects same-attacker sequences
• Recognizes DEX interaction signatures
• Provides MEV protection recommendations

Returns detected sandwich patterns, statistics, and protection strategies.
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                transactionHash: { type: 'string', description: 'Transaction hash to analyze' },
                blockNumber: { type: 'string', description: 'Block number to analyze' },
                victimAddress: { type: 'string', description: 'Check if address was sandwich victim' },
                timeWindow: { type: 'number', description: 'Recent blocks to analyze (default: 100)' }
            },
            required: ['chain']
        }
    },
    {
        name: 'evm_calculate_arbitrage',
        description: `
Calculate arbitrage opportunities across DEX pools.

Compares token prices across multiple DEXs to identify profitable arbitrage trades.
Factors in gas costs, slippage, and flash loan fees.

PARAMETERS:
- chain: Target EVM chain
- tokenIn: Input token address
- tokenOut: Output token address
- amountIn: Amount to arbitrage in token units
- dexes: DEX names to compare (e.g., ["uniswap", "sushiswap"])

ANALYSIS:
• Compares prices across multiple DEXs
• Calculates net profit after gas and fees
• Identifies best arbitrage route
• Estimates execution risk

Returns profit opportunity, optimal route, and execution instructions.
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                tokenIn: { type: 'string', description: 'Input token address' },
                tokenOut: { type: 'string', description: 'Output token address' },
                amountIn: { type: 'string', description: 'Amount to arbitrage' },
                dexes: { type: 'array', items: { type: 'string' }, description: 'DEXs to compare' }
            },
            required: ['chain', 'tokenIn', 'tokenOut', 'amountIn']
        }
    },
    {
        name: 'evm_simulate_bundle',
        description: `
Simulate Flashbots bundle execution before submission.

Tests bundle transactions off-chain to verify profitability and prevent reverts.
Ethereum-focused but provides insights for other chains.

PARAMETERS:
- chain: Target EVM chain (Ethereum recommended)
- transactions: Array of transaction objects to bundle
- targetBlock: Block number for simulation
- stateBlockNumber: Block to use for state (optional)

SIMULATION:
• Validates bundle atomicity
• Checks for reverts
• Estimates profit and costs
• Detects conflicts with pending transactions

Returns simulation results, profit estimates, and revert analysis.
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                transactions: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            to: { type: 'string' },
                            data: { type: 'string' },
                            value: { type: 'string' },
                            gasLimit: { type: 'string' }
                        }
                    },
                    description: 'Transactions to bundle'
                },
                targetBlock: { type: 'number', description: 'Target block for bundle' },
                stateBlockNumber: { type: 'number', description: 'Block for state simulation' }
            },
            required: ['chain', 'transactions', 'targetBlock']
        }
    }
];
