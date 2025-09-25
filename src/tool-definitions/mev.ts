import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { OS_GUIDANCE, CHAIN_GUIDANCE, SUPPORTED_CHAINS } from '../constants/guidance.js';

export const MEV_TOOLS: Tool[] = [
    {
        name: 'evm_send_private_transaction',
        description: `
Send transaction through private mempool to prevent MEV attacks

Protects against frontrunning, sandwich attacks, and other MEV exploitation.
Uses Flashbots on Ethereum, alternative strategies on other chains.

MEV PROTECTION:
- Ethereum: Full Flashbots bundle support
- Other chains: Quick inclusion with high gas strategy
- Prevents transaction from appearing in public mempool
- Simulates bundle before submission

PARAMETERS:
- chain: Target EVM chain
- transaction: Transaction details (to, value, data, gas params)
- privateKey: Private key for signing
- targetBlock: Target block for inclusion (optional)
- maxBlockNumber: Maximum block for inclusion (optional)

Returns bundle hash, simulation results, and MEV protection status.
`,
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                transaction: {
                    type: 'object',
                    properties: {
                        to: { type: 'string' },
                        value: { type: 'string' },
                        data: { type: 'string' },
                        gasLimit: { type: 'string' },
                        maxFeePerGas: { type: 'string' },
                        maxPriorityFeePerGas: { type: 'string' }
                    },
                    required: ['to']
                },
                privateKey: { type: 'string' },
                targetBlock: { type: 'number' },
                maxBlockNumber: { type: 'number' },
                minTimestamp: { type: 'number' },
                hints: { type: 'array', items: { type: 'string' } }
            },
            required: ['chain', 'transaction', 'privateKey']
        }
    }
];
