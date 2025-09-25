/**
 * Get block gas limit and current usage
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

export async function handleGetBlockGasLimit(args: {
  chain: string;
  blockNumber?: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    const config = clientManager.getChainConfig(args.chain);
    const provider = clientManager.getProvider(args.chain);

    // Get block
    let blockNumber: number;
    if (args.blockNumber) {
      blockNumber = parseInt(args.blockNumber);
    } else {
      blockNumber = await provider.getBlockNumber();
    }

    const block = await provider.getBlock(blockNumber);

    if (!block) {
      throw new Error(`Block ${blockNumber} not found`);
    }

    // Calculate utilization
    const gasUsed = block.gasUsed;
    const gasLimit = block.gasLimit;
    const utilization = Number((gasUsed * 10000n) / gasLimit) / 100;
    const available = gasLimit - gasUsed;

    // Get average utilization from recent blocks
    const recentBlocks = await Promise.all([
      provider.getBlock(blockNumber - 1),
      provider.getBlock(blockNumber - 2),
      provider.getBlock(blockNumber - 3),
      provider.getBlock(blockNumber - 4),
      provider.getBlock(blockNumber - 5)
    ]);

    const avgUtilization = recentBlocks
      .filter(b => b !== null)
      .map(b => Number((b!.gasUsed * 10000n) / b!.gasLimit) / 100)
      .reduce((sum, u) => sum + u, 0) / recentBlocks.filter(b => b !== null).length;

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      block: {
        number: blockNumber,
        timestamp: new Date(block.timestamp * 1000).toISOString(),
        transactionCount: block.transactions.length
      },
      gas: {
        limit: gasLimit.toString(),
        used: gasUsed.toString(),
        available: available.toString(),
        utilization: `${utilization.toFixed(2)}%`
      },
      recentAverage: {
        utilization: `${avgUtilization.toFixed(2)}%`,
        blocksAnalyzed: 6
      },
      networkCapacity: {
        isHighDemand: utilization > 90,
        isCongested: avgUtilization > 85,
        status: utilization > 90 ? 'High demand' : avgUtilization > 70 ? 'Moderate' : 'Low demand'
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
