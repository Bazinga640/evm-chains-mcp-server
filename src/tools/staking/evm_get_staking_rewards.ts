import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  address: z.string().describe('Address to check staking rewards for'),
  protocol: z.enum(['native', 'lido', 'rocketPool', 'benqi', 'ankr', 'maticStaking', 'cbETH', 'pancake']).optional(),
  includeHistory: z.boolean().optional().describe('Include historical rewards data')
});

export async function handleGetStakingRewards(args: z.infer<typeof inputSchema>) {
  const validated = inputSchema.parse(args);
  const clientManager = getClientManager();

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: false,
        error: 'Staking rewards tools are disabled on the testnet MCP server.',
        reason: 'Protocols such as Lido, Rocket Pool, Benqi, and Ankr publish reward data only on mainnet deployments.',
        chain: validated.chain,
        environment: 'testnet',
        guidance: [
          'Use the mainnet EVM Chains MCP server for production staking analytics.',
          'For experimentation, deploy mock staking contracts and query them via generic contract tools.'
        ],
        supportedChains: clientManager.getSupportedChains()
      }, null, 2)
    }]
  };
}
