import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SUPPORTED_CHAINS } from '../constants/guidance.js';

export const GASLESS_TOOLS: Tool[] = [
    {
        name: 'evm_generate_permit',
        description: `
Generate EIP-2612 permit signature for gasless token approvals.

Creates off-chain approval signature that can be used instead of on-chain approve() transactions.
Enables gasless user experiences and meta-transactions.

PARAMETERS:
- chain: Target EVM chain
- tokenAddress: ERC20 token with EIP-2612 support
- owner: Token owner address
- spender: Address to approve
- value: Approval amount in token units
- privateKey: Owner's private key for signing
- deadline: Unix timestamp expiry (optional, default: 1 hour)

EIP-2612 PERMIT:
• No approve() transaction needed
• Saves gas fees for users
• One-time use signature
• Can be submitted by relayers
• Signature valid until deadline

Returns permit signature (v,r,s), transaction data, and usage examples.
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                tokenAddress: { type: 'string', description: 'ERC20 token address (must support EIP-2612)' },
                owner: { type: 'string', description: 'Token owner address' },
                spender: { type: 'string', description: 'Address to approve' },
                value: { type: 'string', description: 'Approval amount' },
                privateKey: { type: 'string', description: 'Owner private key' },
                deadline: { type: 'number', description: 'Unix timestamp deadline' }
            },
            required: ['chain', 'tokenAddress', 'owner', 'spender', 'value', 'privateKey']
        }
    },
    {
        name: 'evm_sign_typed_data',
        description: `
Sign EIP-712 typed structured data.

Creates secure, human-readable signatures for structured data (permits, meta-txs, governance votes).
Universal EVM standard for off-chain message signing.

PARAMETERS:
- chain: Target EVM chain
- domain: EIP-712 domain object (name, version, chainId, verifyingContract)
- types: Type definitions for the data
- value: Data to sign
- privateKey: Signer's private key

EIP-712 BENEFITS:
• Human-readable signatures
• Domain separation prevents replay attacks
• Type-safe structured data
• Used by permits, governance, meta-transactions
• Wallet-friendly UX

Returns signature, domain hash, message hash, and signer address.
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                domain: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        version: { type: 'string' },
                        chainId: { type: 'number' },
                        verifyingContract: { type: 'string' }
                    },
                    description: 'EIP-712 domain separator'
                },
                types: {
                    type: 'object',
                    description: 'Type definitions for structured data'
                },
                value: {
                    type: 'object',
                    description: 'Data to sign'
                },
                privateKey: { type: 'string', description: 'Signer private key' }
            },
            required: ['chain', 'domain', 'types', 'value', 'privateKey']
        }
    }
];
