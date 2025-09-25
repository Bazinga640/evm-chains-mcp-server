/**
 * EVM Get Fee History Tool
 *
 * Get historical gas fee data for EIP-1559 chains
 */

import { z } from 'zod';
import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  blockCount: z.number().optional().default(10).describe('Number of blocks to analyze'),
  newestBlock: z.union([z.string(), z.number()]).optional().default('latest').describe('Starting block'),
  rewardPercentiles: z.array(z.number()).optional().describe('Percentiles for priority fee analysis')
});

export async function handleGetFeeHistory(args: z.infer<typeof inputSchema>) {
  const startTime = Date.now();
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);

    const feeHistory = await provider.send('eth_feeHistory', [
      ethers.toBeHex(validated.blockCount),
      validated.newestBlock,
      validated.rewardPercentiles || [25, 50, 75]
    ]);

    const formatted = {
      oldestBlock: parseInt(feeHistory.oldestBlock, 16),
      baseFeePerGas: feeHistory.baseFeePerGas.map((fee: string) => ({
        wei: BigInt(fee).toString(),
        gwei: ethers.formatUnits(BigInt(fee), 'gwei')
      })),
      gasUsedRatio: feeHistory.gasUsedRatio,
      reward: feeHistory.reward ? feeHistory.reward.map((rewards: string[]) =>
        rewards.map(reward => ({
          wei: BigInt(reward).toString(),
          gwei: ethers.formatUnits(BigInt(reward), 'gwei')
        }))
      ) : null
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          blockCount: validated.blockCount,
          feeHistory: formatted,
          executionTime: `${Date.now() - startTime}ms`
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error.message,
          chain: validated.chain,
          executionTime: `${Date.now() - startTime}ms`
        }, null, 2)
      }]
    };
  }
}
