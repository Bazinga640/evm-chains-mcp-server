import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SUPPORTED_CHAINS } from '../constants/guidance.js';

export const STAKING_TOOLS: Tool[] = [
    {
        name: 'evm_get_staking_rewards',
        description: `
Query staking rewards from staking contracts.

Fetches pending and claimed rewards from staking/farming contracts.
Universal across staking protocols.

PARAMETERS:
- chain: Target EVM chain
- address: Address to check staking rewards for
- protocol: Staking protocol (optional)
- includeHistory: Include historical rewards data (optional)

REWARDS INFO:
• Pending unclaimed rewards
• Total claimed rewards
• Reward rate per block/second
• Time until next reward
• APY calculation

Returns pending rewards, claimed total, and reward schedule.
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                address: { type: 'string', description: 'Address to check staking rewards for' },
                protocol: { type: 'string', enum: ['native', 'lido', 'rocketPool', 'benqi', 'ankr', 'maticStaking', 'cbETH', 'pancake'], description: 'Staking protocol (optional)' },
                includeHistory: { type: 'boolean', description: 'Include historical rewards data (optional)' }
            },
            required: ['chain', 'address']
        }
    },
    {
        name: 'evm_stake_tokens',
        description: `
Stake native tokens through liquid staking protocols (Lido, Rocket Pool, etc.)

Supports major staking protocols across all EVM chains with automatic APY calculation.
Returns liquid staking tokens (stETH, rETH, etc.) that earn rewards automatically.

SUPPORTED PROTOCOLS:
- Ethereum: Lido (stETH), Rocket Pool (rETH)
- Polygon: Native POL staking
- Avalanche: Benqi (sAVAX)
- BSC: Ankr staking
- Arbitrum: Lido (wstETH)
- Base: Coinbase (cbETH)

PARAMETERS:
- chain: EVM chain for staking
- amount: Amount to stake in ETH/native token
- protocol: Staking protocol to use (optional, defaults to native)
- validator: Validator address for native staking (optional)
- privateKey: Private key for transaction signing
- referral: Referral address for rewards (optional)

Returns staking receipt with APY, estimated rewards, and liquid token details.
`,
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                amount: { type: 'string' },
                protocol: { type: 'string', enum: ['native', 'lido', 'rocketPool', 'benqi', 'ankr', 'maticStaking', 'cbETH'] },
                validator: { type: 'string' },
                privateKey: { type: 'string' },
                referral: { type: 'string' }
            },
            required: ['chain', 'amount', 'privateKey']
        }
    }
];
