/**
 * Get native token balance for any EVM chain
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';
import { SUPPORTED_CHAINS } from '../../constants/guidance.js';

export async function handleGetBalance(args: {
  chain: string;
  address: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    // Validate inputs
    if (!SUPPORTED_CHAINS.includes(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Chain not available: ${args.chain}`);
    }

    if (!ethers.isAddress(args.address)) {
      throw new Error(`Invalid address: ${args.address}`);
    }

    // Get provider and chain config
    const provider = clientManager.getProvider(args.chain);
    const config = clientManager.getChainConfig(args.chain);
    const checksumAddress = clientManager.getChecksumAddress(args.address);

    // Get balance
    const balance = await provider.getBalance(checksumAddress);
    const balanceInEther = ethers.formatEther(balance);

    // Get current block for context
    const blockNumber = await provider.getBlockNumber();

    const response = {
      success: true,
      chain: args.chain,
      chainId: config.chainId,
      network: config.name,
      address: checksumAddress,
      balance: {
        wei: balance.toString(),
        ether: balanceInEther,
        formatted: `${balanceInEther} ${config.nativeToken}`
      },
      nativeToken: config.nativeToken,
      blockNumber,
      explorer: clientManager.getExplorerUrl(args.chain, checksumAddress),
      timestamp: new Date().toISOString(),
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

