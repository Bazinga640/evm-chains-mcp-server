import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SUPPORTED_CHAINS } from '../constants/guidance.js';

// Note: evm_resolve_ens (forward lookup) is already in network-gas.ts
// This file contains reverse ENS lookup only

export const ENS_TOOLS: Tool[] = [
    {
        name: 'evm_reverse_ens_lookup',
        description: `
Reverse ENS lookup - resolve address to ENS name.

Queries ENS reverse records to find the primary ENS name for an address.
Primarily works on Ethereum mainnet/Sepolia.

PARAMETERS:
- chain: Target EVM chain (ethereum recommended)
- address: Ethereum address to lookup

ENS REVERSE:
• Finds primary ENS name for address
• Returns null if no reverse record set
• Address owner must set reverse record
• Works best on Ethereum mainnet/testnet

USAGE:
• Display human-readable names for addresses
• Verify address ownership
• Wallet identity resolution
• DApp user experience

Returns ENS name if set, null otherwise.
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                address: { type: 'string', description: 'Ethereum address for reverse lookup' }
            },
            required: ['chain', 'address']
        }
    }
];
