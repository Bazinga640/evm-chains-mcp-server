/**
 * Get comprehensive network status and health metrics
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

export async function handleGetNetworkInfo(args: {
  chain: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    const config = clientManager.getChainConfig(args.chain);
    const provider = clientManager.getProvider(args.chain);

    // Fetch network metrics
    const [blockNumber, gasPrice, feeData, network] = await Promise.all([
      provider.getBlockNumber(),
      provider.getFeeData().then(f => f.gasPrice),
      provider.getFeeData(),
      provider.getNetwork()
    ]);

    // Get latest block for additional metrics
    const latestBlock = await provider.getBlock(blockNumber);

    if (!latestBlock) {
      throw new Error('Failed to fetch latest block');
    }

    // Calculate block utilization
    const gasUsed = latestBlock.gasUsed;
    const gasLimit = latestBlock.gasLimit;
    const utilization = Number((gasUsed * 10000n) / gasLimit) / 100;

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      status: {
        chainId: network.chainId.toString(),
        blockNumber: blockNumber,
        latestBlockTime: new Date(latestBlock.timestamp * 1000).toISOString(),
        blockInterval: '~12s'
      },
      gas: {
        currentPrice: gasPrice ? ethers.formatUnits(gasPrice, 'gwei') : 'N/A',
        maxFeePerGas: feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei') : 'N/A',
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei') : 'N/A'
      },
      block: {
        number: blockNumber,
        gasUsed: gasUsed.toString(),
        gasLimit: gasLimit.toString(),
        utilization: `${utilization.toFixed(2)}%`,
        baseFeePerGas: latestBlock.baseFeePerGas ? ethers.formatUnits(latestBlock.baseFeePerGas, 'gwei') : 'N/A'
      },
      explorer: config.explorer,
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
