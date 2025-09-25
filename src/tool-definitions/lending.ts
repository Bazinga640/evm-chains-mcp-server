import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SUPPORTED_CHAINS } from '../constants/guidance.js';

export const LENDING_TOOLS: Tool[] = [
    {
        name: 'evm_supply_asset',
        description: `
Supply assets to lending protocols (Aave, Compound, etc.).

Deposit tokens to earn interest and use as collateral for borrowing.
Works with major lending protocols across chains.

PARAMETERS:
- chain: Target EVM chain
- protocol: Lending protocol (aave, compound, radiant, etc.) - optional, auto-detects
- asset: Token address to supply
- amount: Amount to supply in token units
- privateKey: Supplier's private key
- enableAsCollateral: Use as collateral for borrowing (default: true)

LENDING PROTOCOLS:
• Aave: Most chains, variable/stable rates
• Compound: Ethereum, algorithmic rates
• Radiant: Arbitrum, cross-chain collateral
• Venus: BSC, isolated pools

SUPPLY BENEFITS:
• Earn interest on idle assets
• Use as collateral for loans
• Receive aTokens/cTokens (interest-bearing)
• Withdraw anytime (if not borrowed against)

Returns supplied amount, aTokens received, APY, and collateral status.
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                protocol: {
                    type: 'string',
                    enum: ['aave', 'compound', 'radiant', 'venus', 'benqi'],
                    description: 'Lending protocol (optional, auto-detects)'
                },
                asset: { type: 'string', description: 'Token address to supply' },
                amount: { type: 'string', description: 'Supply amount in token units' },
                privateKey: { type: 'string', description: 'Supplier private key' },
                enableAsCollateral: { type: 'boolean', description: 'Enable as collateral (default: true)' }
            },
            required: ['chain', 'asset', 'amount', 'privateKey']
        }
    }
];
