/**
 * EVM Get Code Tool
 *
 * Get the bytecode of a smart contract at a given address
 */

import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  address: z.string().describe('Contract address'),
  blockTag: z.string().optional().describe('Block number or "latest"')
});

export async function handleGetCode(args: z.infer<typeof inputSchema>) {
  const startTime = Date.now();
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);
    const config = clientManager.getChainConfig(validated.chain);

    // Validate and checksum the address
    if (!clientManager.isValidAddress(validated.address)) {
      throw new Error(`Invalid address format: ${validated.address}`);
    }
    const checksummedAddress = clientManager.getChecksumAddress(validated.address);

    const code = await provider.getCode(checksummedAddress, validated.blockTag || 'latest');
    const isContract = code !== '0x';

    // Add helpful troubleshooting for empty bytecode
    const troubleshooting = !isContract ? {
      possibleReasons: [
        'Address is an EOA (externally owned account), not a contract',
        'Contract not deployed on this network (check if using correct chain)',
        'Contract was self-destructed',
        'Address does not exist on this testnet'
      ],
      suggestion: `Verify contract exists on ${config.name} testnet at ${config.explorer}/address/${checksummedAddress}`
    } : undefined;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          network: config.name,
          address: checksummedAddress,
          code,
          isContract,
          codeSize: isContract ? (code.length / 2 - 1) : 0,
          bytecodePreview: isContract ? code.substring(0, 66) + '...' : null,
          explorer: `${config.explorer}/address/${checksummedAddress}`,
          troubleshooting,
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
