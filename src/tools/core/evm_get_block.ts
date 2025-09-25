/**
 * Get block information for any EVM chain
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

export async function handleGetBlock(args: {
  chain: string;
  blockNumber?: number | string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    // Validate inputs
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    // Get provider and config
    const provider = clientManager.getProvider(args.chain);
    const config = clientManager.getChainConfig(args.chain);

    // Determine block number (default to latest)
    let blockIdentifier: number | string = 'latest';
    if (args.blockNumber !== undefined) {
      if (typeof args.blockNumber === 'string' && args.blockNumber === 'latest') {
        blockIdentifier = 'latest';
      } else {
        blockIdentifier = Number(args.blockNumber);
      }
    }

    // Get block
    const block = await provider.getBlock(blockIdentifier);

    if (!block) {
      throw new Error(`Block not found: ${blockIdentifier}`);
    }

    // Get transaction count
    const txCount = block.transactions.length;

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      block: {
        number: block.number,
        hash: block.hash,
        parentHash: block.parentHash,
        timestamp: block.timestamp,
        datetime: new Date(block.timestamp * 1000).toISOString(),
        miner: block.miner,
        difficulty: block.difficulty?.toString(),
        gasLimit: block.gasLimit.toString(),
        gasUsed: block.gasUsed.toString(),
        gasUtilization: `${((Number(block.gasUsed) / Number(block.gasLimit)) * 100).toFixed(2)}%`,
        baseFeePerGas: block.baseFeePerGas ? ethers.formatUnits(block.baseFeePerGas, 'gwei') + ' gwei' : null,
        extraData: block.extraData,
        transactionCount: txCount,
        transactions: block.transactions.slice(0, 10), // First 10 tx hashes
        transactionsTruncated: txCount > 10,
        size: block.length || null,
        nonce: block.nonce || null
      },
      explorer: `${config.explorer}/block/${block.number}`,
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
      blockNumber: args.blockNumber || 'latest',
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
