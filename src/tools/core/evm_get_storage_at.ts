/**
 * EVM Get Storage At Tool
 *
 * Get the value from a contract's storage slot
 */

import { z } from 'zod';
import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  address: z.string().describe('Contract address'),
  position: z.union([z.string(), z.number()]).describe('Storage slot position'),
  blockTag: z.string().optional().describe('Block number or "latest"')
});

export async function handleGetStorageAt(args: z.infer<typeof inputSchema>) {
  const startTime = Date.now();
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);

    const storage = await provider.getStorage(
      validated.address,
      validated.position,
      validated.blockTag || 'latest'
    );

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          address: validated.address,
          position: validated.position,
          value: storage,
          valueDecimal: BigInt(storage).toString(),
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
          position: validated.position,
          executionTime: `${Date.now() - startTime}ms`
        }, null, 2)
      }]
    };
  }
}
