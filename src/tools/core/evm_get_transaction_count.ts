/**
 * EVM Get Transaction Count Tool
 *
 * Get the number of transactions sent from an address (nonce)
 */

import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  address: z.string().describe('Address to check'),
  blockTag: z.string().optional().describe('Block number or "latest", "earliest", "pending"')
});

export async function handleGetTransactionCount(args: z.infer<typeof inputSchema>) {
  const startTime = Date.now();
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);

    const transactionCount = await provider.getTransactionCount(
      validated.address,
      validated.blockTag || 'latest'
    );

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          address: validated.address,
          transactionCount,
          nonce: transactionCount,
          blockTag: validated.blockTag || 'latest',
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
          address: validated.address,
          executionTime: `${Date.now() - startTime}ms`
        }, null, 2)
      }]
    };
  }
}
