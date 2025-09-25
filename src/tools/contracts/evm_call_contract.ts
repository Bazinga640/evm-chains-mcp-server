/**
 * Call a smart contract function (read-only)
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

export async function handleCallContract(args: {
  chain: string;
  contractAddress: string;
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
    const provider = clientManager.getProvider(args.chain);
    const contractAddress = clientManager.getChecksumAddress(args.contractAddress);

    const contract = new ethers.Contract(contractAddress, args.abi, provider);

    // Call the function (read-only)
    const params = args.params || [];
    const result = await contract[args.functionName](...params);

    // Helper function to serialize contract call results
    const serializeResult = (value: any): any => {
      if (value === null || value === undefined) {
        return null;
      }

      // Handle BigInt
      if (typeof value === 'bigint') {
        return value.toString();
      }

      // Handle Result objects from ethers (arrays with named properties)
      if (Array.isArray(value)) {
        return value.map(serializeResult);
      }

      // Handle objects
      if (typeof value === 'object') {
        // Check if it has a toString method that's not Object.prototype.toString
        if (value.toString && value.toString !== Object.prototype.toString) {
          try {
            const stringified = value.toString();
            // If toString returns [object Object], try JSON approach
            if (stringified === '[object Object]') {
              const serialized: any = {};
              for (const key in value) {
                if (Object.prototype.hasOwnProperty.call(value, key)) {
                  serialized[key] = serializeResult(value[key]);
                }
              }
              return serialized;
            }
            return stringified;
          } catch {
            return String(value);
          }
        }

        // Serialize object properties
        const serialized: any = {};
        for (const key in value) {
          if (Object.prototype.hasOwnProperty.call(value, key)) {
            serialized[key] = serializeResult(value[key]);
          }
        }
        return serialized;
      }

      return value;
    };

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      contract: {
        address: contractAddress,
        function: args.functionName
      },
      call: {
        parameters: params,
        result: serializeResult(result)
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
        'invalid address': 'Check contract address format',
        'function not found': 'Verify function exists in ABI',
        'invalid parameters': 'Check parameter types and values'
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
