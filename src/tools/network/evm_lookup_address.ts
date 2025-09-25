/**
 * EVM Lookup Address Tool
 *
 * Reverse resolve Ethereum address to ENS name (if configured)
 * Note: ENS is primarily on Ethereum mainnet. Testnet support varies.
 */

import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  address: z.string().describe('Ethereum address to reverse resolve')
});

export async function handleLookupAddress(args: z.infer<typeof inputSchema>) {
  const startTime = Date.now();
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);

    // Reverse resolve address to ENS name
    const ensName = await provider.lookupAddress(validated.address);

    if (!ensName) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            chain: validated.chain,
            address: validated.address,
            ensName: null,
            message: 'No ENS name configured for this address on this network',
            note: 'ENS reverse resolution is primarily supported on Ethereum mainnet.',
            executionTime: `${Date.now() - startTime}ms`
          }, null, 2)
        }]
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          address: validated.address,
          ensName,
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
          note: 'ENS reverse resolution requires network support and proper configuration',
          executionTime: `${Date.now() - startTime}ms`
        }, null, 2)
      }]
    };
  }
}
