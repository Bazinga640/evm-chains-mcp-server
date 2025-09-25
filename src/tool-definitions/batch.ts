import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { OS_GUIDANCE, CHAIN_GUIDANCE, SUPPORTED_CHAINS } from '../constants/guidance.js';

export const BATCH_TOOLS: Tool[] = [
    {
        name: 'evm_multicall',
        description: `
Execute multiple contract calls in a single transaction

Batch multiple read/write operations for gas efficiency.
Uses Multicall3 for atomic execution.

FEATURES:
- Atomic execution of multiple calls
- Gas savings vs individual transactions
- Allow selective call failures
- Automatic result decoding
- Works with any contract

PARAMETERS:
- chain: Target blockchain
- calls: Array of calls with target, callData, allowFailure
- requireSuccess: Require all calls to succeed (default true)
- gasLimit: Gas limit per call (optional)

Returns results array with decoded data and gas savings.
`,
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                calls: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            target: { type: 'string' },
                            callData: { type: 'string' },
                            allowFailure: { type: 'boolean', default: false }
                        },
                        required: ['target', 'callData']
                    }
                },
                requireSuccess: { type: 'boolean', default: true },
                gasLimit: { type: 'string' }
            },
            required: ['chain', 'calls']
        }
    }
];
