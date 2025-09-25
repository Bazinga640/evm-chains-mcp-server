import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { OS_GUIDANCE, CHAIN_GUIDANCE, SUPPORTED_CHAINS } from '../constants/guidance.js';

export const MEMPOOL_TOOLS: Tool[] = [
    {
        name: 'evm_get_mempool_info',
        description: `
Monitor pending transactions in the mempool for MEV opportunities

Scans mempool for pending transactions with filtering and MEV detection.
Identifies arbitrage opportunities, sandwich targets, and large transactions.

FEATURES:
- Real-time pending transaction monitoring
- Filter by value, sender, recipient, gas price
- MEV opportunity detection
- Transaction statistics and analysis

PARAMETERS:
- chain: Target chain
- filter: Optional filters (minValue, to, from, minGasPrice)
- limit: Max transactions to return (default 100)
- includeDetails: Include full transaction data

Returns pending transactions, statistics, and MEV opportunities.
`,
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                filter: {
                    type: 'object',
                    properties: {
                        minValue: { type: 'string' },
                        to: { type: 'string' },
                        from: { type: 'string' },
                        minGasPrice: { type: 'string' }
                    }
                },
                limit: { type: 'number', default: 100 },
                includeDetails: { type: 'boolean' }
            },
            required: ['chain']
        }
    }
];
