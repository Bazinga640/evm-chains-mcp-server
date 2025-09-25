import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SUPPORTED_CHAINS } from '../constants/guidance.js';

// Token factory tools - specialized token deployment with safety features
export const TOKEN_FACTORY_TOOLS: Tool[] = [
    {
        name: 'evm_create_token_safe',
        description: `
Deploy ERC20 token with enhanced safety features.

Creates token with built-in protections: max transaction limits, anti-whale mechanisms,
trading pauses, and ownership controls.

PARAMETERS:
- chain: Target EVM chain
- name: Token name
- symbol: Token symbol
- decimals: Token decimals (default: 18)
- initialSupply: Initial token supply
- maxTransactionPercent: Max tx as % of supply (anti-whale)
- maxWalletPercent: Max wallet holding as % of supply
- privateKey: Deployer private key

SAFETY FEATURES:
• Max transaction size limits
• Max wallet holding limits
• Emergency pause capability
• Ownership controls
• Anti-bot mechanisms
• Burn capability

Returns deployed token address, safety parameters, and admin controls.
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                name: { type: 'string', description: 'Token name' },
                symbol: { type: 'string', description: 'Token symbol' },
                decimals: { type: 'number', description: 'Token decimals (default: 18)' },
                initialSupply: { type: 'string', description: 'Initial supply' },
                maxTransactionPercent: { type: 'number', description: 'Max tx % of supply' },
                maxWalletPercent: { type: 'number', description: 'Max wallet % of supply' },
                privateKey: { type: 'string', description: 'Deployer private key' }
            },
            required: ['chain', 'name', 'symbol', 'initialSupply', 'privateKey']
        }
    }
];
