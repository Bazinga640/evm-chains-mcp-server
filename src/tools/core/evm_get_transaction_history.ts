/**
 * Get transaction history for an address on any EVM chain
 * Note: This is a simplified version. For production, you'd want to use block explorer APIs
 * like Etherscan, as RPC providers don't have indexed transaction history.
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

export async function handleGetTransactionHistory(args: {
  chain: string;
  address: string;
  limit?: number;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    // Validate inputs
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    if (!clientManager.isValidAddress(args.address)) {
      throw new Error(`Invalid address: ${args.address}`);
    }

    // Get provider and config
    const provider = clientManager.getProvider(args.chain);
    const config = clientManager.getChainConfig(args.chain);
    const checksumAddress = clientManager.getChecksumAddress(args.address);

    // Get transaction count
    const txCount = await provider.getTransactionCount(checksumAddress);

    // Note: RPC providers don't provide indexed transaction history
    // This would require integration with block explorer APIs (Etherscan, etc.)
    // For now, we'll return available information and guidance

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      address: checksumAddress,
      transactionCount: txCount,
      note: 'Full transaction history requires block explorer API integration',
      alternatives: {
        etherscan: `${config.explorer}/address/${checksumAddress}`,
        method: 'Use block explorer APIs (Etherscan, Polygonscan, etc.) for full history',
        recommendation: 'Consider using evm_get_transaction for specific transaction hashes'
      },
      // Provide what we can
      accountInfo: {
        totalTransactions: txCount,
        nextNonce: txCount,
        hasTransactions: txCount > 0
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
