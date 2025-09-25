/**
 * Get gas price recommendations (slow/standard/fast)
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

export async function handleGetGasOracle(args: {
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

    // Get current fee data
    const feeData = await provider.getFeeData();

    if (!feeData.gasPrice && !feeData.maxFeePerGas) {
      throw new Error('Unable to fetch gas price data');
    }

    // For EIP-1559 chains
    if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
      const baseFee = feeData.maxFeePerGas - feeData.maxPriorityFeePerGas;
      const slowPriority = feeData.maxPriorityFeePerGas / 2n;
      const standardPriority = feeData.maxPriorityFeePerGas;
      const fastPriority = (feeData.maxPriorityFeePerGas * 15n) / 10n;

      const response = {
        success: true,
        chain: args.chain,
        network: config.name,
        type: 'EIP-1559',
        recommendations: {
          slow: {
            maxFeePerGas: ethers.formatUnits(baseFee + slowPriority, 'gwei'),
            maxPriorityFeePerGas: ethers.formatUnits(slowPriority, 'gwei'),
            estimatedTime: '~2-3 minutes'
          },
          standard: {
            maxFeePerGas: ethers.formatUnits(baseFee + standardPriority, 'gwei'),
            maxPriorityFeePerGas: ethers.formatUnits(standardPriority, 'gwei'),
            estimatedTime: '~1 minute'
          },
          fast: {
            maxFeePerGas: ethers.formatUnits(baseFee + fastPriority, 'gwei'),
            maxPriorityFeePerGas: ethers.formatUnits(fastPriority, 'gwei'),
            estimatedTime: '~15 seconds'
          }
        },
        current: {
          baseFeePerGas: ethers.formatUnits(baseFee, 'gwei'),
          maxPriorityFeePerGas: ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei')
        },
        executionTime: `${Date.now() - startTime}ms`
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }]
      };
    }

    // For legacy chains
    const gasPrice = feeData.gasPrice!;
    const slowPrice = (gasPrice * 8n) / 10n;
    const standardPrice = gasPrice;
    const fastPrice = (gasPrice * 12n) / 10n;

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      type: 'Legacy',
      recommendations: {
        slow: {
          gasPrice: ethers.formatUnits(slowPrice, 'gwei'),
          estimatedTime: '~2-3 minutes'
        },
        standard: {
          gasPrice: ethers.formatUnits(standardPrice, 'gwei'),
          estimatedTime: '~1 minute'
        },
        fast: {
          gasPrice: ethers.formatUnits(fastPrice, 'gwei'),
          estimatedTime: '~15 seconds'
        }
      },
      current: {
        gasPrice: ethers.formatUnits(gasPrice, 'gwei')
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
