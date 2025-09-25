/**
 * EVM Resolve ENS Tool
 *
 * Resolve ENS (Ethereum Name Service) name to Ethereum address
 * Note: ENS is primarily on Ethereum mainnet. Testnet support varies.
 */

import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  ensName: z.string().describe('ENS name to resolve (e.g., vitalik.eth)')
});

export async function handleResolveEns(args: z.infer<typeof inputSchema>) {
  const startTime = Date.now();
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);

    // Resolve ENS name to address
    const resolvedAddress = await provider.resolveName(validated.ensName);

    if (!resolvedAddress) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            chain: validated.chain,
            ensName: validated.ensName,
            error: 'ENS name not found or not configured on this network',
            note: 'ENS is primarily supported on Ethereum mainnet. Testnet support is limited.',
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
          ensName: validated.ensName,
          resolvedAddress,
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
          ensName: validated.ensName,
          note: 'ENS resolution requires network support and proper configuration',
          executionTime: `${Date.now() - startTime}ms`
        }, null, 2)
      }]
    };
  }
}
