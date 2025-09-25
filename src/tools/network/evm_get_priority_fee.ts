/**
 * Get recommended priority fee (EIP-1559)
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

export async function handleGetPriorityFee(args: {
  chain: string;
  percentile?: number;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    const config = clientManager.getChainConfig(args.chain);
    const provider = clientManager.getProvider(args.chain);

    // Get current fee data
    const feeData = await provider.getFeeData();

    if (!feeData.maxPriorityFeePerGas) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'EIP-1559 priority fees not supported on this chain',
            chain: args.chain,
            network: config.name,
            note: 'This chain uses legacy gas pricing'
          }, null, 2)
        }]
      };
    }

    const currentPriorityFee = feeData.maxPriorityFeePerGas;

    // Calculate recommendations based on percentile
    const percentile = args.percentile || 50;
    let multiplier: bigint;
    let speed: string;
    let estimatedTime: string;

    if (percentile <= 25) {
      multiplier = 5n;
      speed = 'slow';
      estimatedTime = '~3-5 minutes';
    } else if (percentile <= 50) {
      multiplier = 10n;
      speed = 'standard';
      estimatedTime = '~1-2 minutes';
    } else if (percentile <= 75) {
      multiplier = 15n;
      speed = 'fast';
      estimatedTime = '~30-60 seconds';
    } else {
      multiplier = 20n;
      speed = 'instant';
      estimatedTime = '~15-30 seconds';
    }

    const recommendedFee = (currentPriorityFee * multiplier) / 10n;

    // Get block for additional context
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      priorityFee: {
        current: ethers.formatUnits(currentPriorityFee, 'gwei'),
        recommended: ethers.formatUnits(recommendedFee, 'gwei'),
        speed,
        percentile,
        estimatedTime
      },
      recommendations: {
        slow: {
          fee: ethers.formatUnits((currentPriorityFee * 5n) / 10n, 'gwei'),
          percentile: 25,
          time: '~3-5 minutes'
        },
        standard: {
          fee: ethers.formatUnits(currentPriorityFee, 'gwei'),
          percentile: 50,
          time: '~1-2 minutes'
        },
        fast: {
          fee: ethers.formatUnits((currentPriorityFee * 15n) / 10n, 'gwei'),
          percentile: 75,
          time: '~30-60 seconds'
        },
        instant: {
          fee: ethers.formatUnits((currentPriorityFee * 20n) / 10n, 'gwei'),
          percentile: 95,
          time: '~15-30 seconds'
        }
      },
      networkStatus: {
        blockNumber,
        blockUtilization: block ? `${(Number((block.gasUsed * 10000n) / block.gasLimit) / 100).toFixed(2)}%` : 'N/A',
        baseFee: feeData.maxFeePerGas && currentPriorityFee
          ? ethers.formatUnits(feeData.maxFeePerGas - currentPriorityFee, 'gwei')
          : 'N/A'
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
