/**
 * EVM Decode Function Result Tool
 *
 * Decode function return data from transaction or call
 */

import { z } from 'zod';
import { ethers } from 'ethers';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  abi: z.array(z.any()).describe('Contract ABI'),
  functionName: z.string().describe('Function name that returned this data'),
  data: z.string().describe('Hex-encoded return data to decode')
});

export async function handleDecodeFunctionResult(args: z.infer<typeof inputSchema>) {
  const startTime = Date.now();
  const validated = inputSchema.parse(args);

  try {
    // Create contract interface
    const iface = new ethers.Interface(validated.abi);

    // Decode function result
    const decodedResult = iface.decodeFunctionResult(
      validated.functionName,
      validated.data
    );

    // Get function fragment for additional info
    const fragment = iface.getFunction(validated.functionName);
    const outputs = fragment?.outputs || [];

    // Convert result to more readable format
    const formattedResult: any = {};
    outputs.forEach((output, index) => {
      const value = decodedResult[index];
      const name = output.name || `output${index}`;

      // Convert BigInt to string for JSON serialization
      if (typeof value === 'bigint') {
        formattedResult[name] = value.toString();
      } else if (value && typeof value === 'object' && value._isBigNumber) {
        formattedResult[name] = value.toString();
      } else {
        formattedResult[name] = value;
      }
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          functionName: validated.functionName,
          decodedResult: formattedResult,
          rawResult: decodedResult.toArray().map((v: any) =>
            typeof v === 'bigint' ? v.toString() : v
          ),
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
