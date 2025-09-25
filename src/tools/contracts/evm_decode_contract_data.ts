/**
 * Decode contract transaction input data
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

export async function handleDecodeContractData(args: {
  chain: string;
  abi: any[];
  data: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    const config = clientManager.getChainConfig(args.chain);
    const iface = new ethers.Interface(args.abi);

    // Decode the data
    const decoded = iface.parseTransaction({ data: args.data });

    if (!decoded) {
      throw new Error('Unable to decode transaction data');
    }

    // Convert BigInt values to strings for JSON serialization
    const convertValue = (arg: any): any => {
      if (typeof arg === 'bigint') {
        return arg.toString();
      } else if (typeof arg === 'object' && arg !== null) {
        return arg.toString();
      }
      return arg;
    };

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      decoded: {
        functionName: decoded.name,
        functionSignature: decoded.signature,
        arguments: decoded.args.map((arg: any, index: number) => ({
          index,
          value: convertValue(arg),
          type: typeof arg === 'bigint' ? 'bigint' : typeof arg
        })),
        // Also provide args as a simple array for easier access
        values: decoded.args.map(convertValue)
      },
      executionTime: `${Date.now() - startTime}ms`
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  } catch (error: any) {
    const errorResponse = {
      success: false,
      error: error.message,
      chain: args.chain,
      timestamp: new Date().toISOString(),
      executionTime: `${Date.now() - startTime}ms`,
      troubleshooting: {
        'no matching function': 'ABI does not contain function matching the data',
        'invalid data': 'Check that data is a valid hex string'
      }
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(errorResponse, null, 2)
      }]
    };
  }
}
