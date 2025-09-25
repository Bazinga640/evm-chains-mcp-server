/**
 * EVM Encode Function Data Tool
 *
 * Encode function call data for transaction construction
 */

import { z } from 'zod';
import { ethers } from 'ethers';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  abi: z.array(z.any()).describe('Contract ABI'),
  functionName: z.string().describe('Function name to encode'),
  args: z.array(z.any()).optional().describe('Function arguments')
});

export async function handleEncodeFunctionData(args: z.infer<typeof inputSchema>) {
  const startTime = Date.now();
  const validated = inputSchema.parse(args);

  try {
    // Create contract interface
    const iface = new ethers.Interface(validated.abi);

    // Encode function data
    const encodedData = iface.encodeFunctionData(
      validated.functionName,
      validated.args || []
    );

    // Get function fragment for additional info
    const fragment = iface.getFunction(validated.functionName);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          functionName: validated.functionName,
          encodedData,
          selector: encodedData.slice(0, 10),
          functionSignature: fragment?.format('sighash'),
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
          functionName: validated.functionName,
          executionTime: `${Date.now() - startTime}ms`
        }, null, 2)
      }]
    };
  }
}
