/**
 * Validate Ethereum address for any EVM chain
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

export async function handleValidateAddress(args: {
  chain: string;
  address: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    // Validate chain
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    const config = clientManager.getChainConfig(args.chain);

    // Check if address is valid
    const isValid = ethers.isAddress(args.address);

    let checksumAddress = null;
    let isChecksum = false;
    let isContract = false;

    if (isValid) {
      // Get checksummed address
      checksumAddress = ethers.getAddress(args.address);

      // Check if original address was checksummed
      isChecksum = args.address === checksumAddress;

      // Check if it's a contract
      const provider = clientManager.getProvider(args.chain);
      const code = await provider.getCode(checksumAddress);
      isContract = code !== '0x';
    }

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      validation: {
        address: args.address,
        isValid,
        checksumAddress,
        isChecksum,
        addressType: isContract ? 'contract' : 'externally owned account (EOA)',
        isContract,
        warnings: [] as string[]
      },
      explorer: isValid ? clientManager.getExplorerUrl(args.chain, checksumAddress!) : null,
      executionTime: `${Date.now() - startTime}ms`
    };

    // Add warnings
    if (isValid && !isChecksum) {
      response.validation.warnings.push('Address is not checksummed - recommend using checksummed version');
    }

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
      address: args.address,
      timestamp: new Date().toISOString(),
      executionTime: `${Date.now() - startTime}ms`
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(errorResponse, null, 2)
      }]
    };
  }
}
