/**
 * EVM Get Block Number Tool
 *
 * Get the latest block number from the blockchain
 */

import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain'])
});

export async function handleGetBlockNumber(args: z.infer<typeof inputSchema>) {
  const startTime = Date.now();
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);

    const blockNumber = await provider.getBlockNumber();

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          blockNumber,
          timestamp: new Date().toISOString(),
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
