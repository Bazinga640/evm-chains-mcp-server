/**
 * Encode contract function call data
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

export async function handleEncodeContractData(args: {
  chain: string;
  abi: any[];
  functionName: string;
  params?: any[];
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    const config = clientManager.getChainConfig(args.chain);
    const iface = new ethers.Interface(args.abi);

    // Encode the function call
    const params = args.params || [];
    const encodedData = iface.encodeFunctionData(args.functionName, params);

    // Get function signature
    const fragment = iface.getFunction(args.functionName);
    if (!fragment) {
      throw new Error(`Function ${args.functionName} not found in ABI`);
    }

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      encoding: {
        functionName: args.functionName,
        functionSignature: fragment.format('sighash'),
        parameters: params,
        encodedData,
        dataLength: encodedData.length
      },
      usage: 'Use this encoded data in send_contract_transaction or raw transaction',
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
        'function not found': 'Verify function exists in ABI',
        'invalid parameters': 'Check parameter types match ABI'
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
