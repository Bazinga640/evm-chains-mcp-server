import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SUPPORTED_CHAINS } from '../constants/guidance.js';

export const TOKEN_STREAMING_TOOLS: Tool[] = [
    {
        name: 'evm_create_token_stream',
        description: `
Create continuous token streaming/vesting schedule.

Sets up linear vesting streams for salaries, grants, or payment scheduling.
Tokens unlock continuously over time (Sablier-style).

PARAMETERS:
- chain: Target EVM chain
- streamType: linear | dynamic (optional, default: linear)
- token: ERC20 token address to stream
- recipient: Stream recipient address
- totalAmount: Total amount to stream
- duration: Stream duration in seconds
- startTime: Unix timestamp start (optional, default: now)
- cliffDuration: Cliff period in seconds (optional, default: 0)
- cancelable: Whether sender can cancel (optional, default: true)
- privateKey: Sender's private key
- streamingContract: Streaming contract address (optional override)

STREAMING:
• Linear vesting over time period
• Recipient can withdraw unlocked tokens anytime
• Sender can cancel and recover unvested tokens
• No intermediaries or trust required
• Common for salaries and grants

Returns stream ID, unlock schedule, and withdrawal instructions.
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                streamType: { type: 'string', enum: ['linear', 'dynamic'], description: 'Linear (constant) or dynamic (custom curve) - default: linear' },
                token: { type: 'string', description: 'ERC20 token address' },
                recipient: { type: 'string', description: 'Stream recipient address' },
                totalAmount: { type: 'string', description: 'Total amount to stream' },
                duration: { type: 'number', description: 'Stream duration in seconds' },
                startTime: { type: 'number', description: 'Unix timestamp start (optional, default: now)' },
                cliffDuration: { type: 'number', description: 'Cliff period in seconds (optional, default: 0)' },
                cancelable: { type: 'boolean', description: 'Can sender cancel stream (optional, default: true)' },
                privateKey: { type: 'string', description: 'Sender private key' },
                streamingContract: { type: 'string', description: 'Streaming contract address (optional)' }
            },
            required: ['chain', 'token', 'recipient', 'totalAmount', 'duration', 'privateKey']
        }
    }
];
