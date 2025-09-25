import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  amount: z.string().describe('Amount to stake in ETH/native token'),
  protocol: z.enum(['native', 'lido', 'rocketPool', 'benqi', 'ankr', 'maticStaking', 'cbETH']).optional(),
  validator: z.string().optional().describe('Validator address for native staking'),
  privateKey: z.string().describe('Private key for transaction signing'),
  referral: z.string().optional().describe('Referral address for rewards')
});

export async function handleStakeTokens(args: z.infer<typeof inputSchema>) {
  const validated = inputSchema.parse(args);
  const clientManager = getClientManager();

  // This server targets testnets only. Liquid staking protocols require mainnet deployments,
  // so we block execution here with a clear message instead of letting users hit confusing RPC errors.
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: false,
        error: 'Staking tools are disabled on the testnet MCP server.',
        reason: 'Providers such as Lido, Rocket Pool, Benqi, and Ankr only deploy contracts on mainnet networks.',
        chain: validated.chain,
        environment: 'testnet',
        guidance: [
          'Use the mainnet EVM Chains MCP server for production staking flows.',
          'For local testing, deploy mock staking contracts and interact via generic contract tools.'
        ],
        supportedChains: clientManager.getSupportedChains(),
        note: 'Tool definitions remain for schema compatibility, but execution is intentionally blocked.'
      }, null, 2)
    }]
  };
}
