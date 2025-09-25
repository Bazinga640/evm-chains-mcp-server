/**
 * Get current gas price for any EVM chain
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

export async function handleGetGasPrice(args: {
  chain: string;
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

    // Get fee data
    const feeData = await provider.getFeeData();
    const blockNumber = await provider.getBlockNumber();

    // Check if EIP-1559 is supported (has maxFeePerGas)
    const isEIP1559 = feeData.maxFeePerGas !== null;

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      chainId: config.chainId,
      blockNumber,
      gasPrice: isEIP1559 ? {
        type: 'EIP-1559',
        maxFeePerGas: {
          wei: feeData.maxFeePerGas!.toString(),
          gwei: ethers.formatUnits(feeData.maxFeePerGas!, 'gwei'),
          formatted: `${ethers.formatUnits(feeData.maxFeePerGas!, 'gwei')} gwei`
        },
        maxPriorityFeePerGas: {
          wei: feeData.maxPriorityFeePerGas!.toString(),
          gwei: ethers.formatUnits(feeData.maxPriorityFeePerGas!, 'gwei'),
          formatted: `${ethers.formatUnits(feeData.maxPriorityFeePerGas!, 'gwei')} gwei`
        },
        baseFee: feeData.maxFeePerGas && feeData.maxPriorityFeePerGas ? {
          wei: (feeData.maxFeePerGas - feeData.maxPriorityFeePerGas).toString(),
          gwei: ethers.formatUnits(feeData.maxFeePerGas - feeData.maxPriorityFeePerGas, 'gwei'),
          formatted: `${ethers.formatUnits(feeData.maxFeePerGas - feeData.maxPriorityFeePerGas, 'gwei')} gwei`
        } : null,
        // Legacy for backwards compatibility
        gasPrice: feeData.gasPrice ? {
          wei: feeData.gasPrice.toString(),
          gwei: ethers.formatUnits(feeData.gasPrice, 'gwei'),
          formatted: `${ethers.formatUnits(feeData.gasPrice, 'gwei')} gwei`
        } : null
      } : {
        type: 'Legacy',
        gasPrice: {
          wei: feeData.gasPrice!.toString(),
          gwei: ethers.formatUnits(feeData.gasPrice!, 'gwei'),
          formatted: `${ethers.formatUnits(feeData.gasPrice!, 'gwei')} gwei`
        }
      },
      estimatedCost: {
        simpleTransfer: isEIP1559
          ? `~${ethers.formatEther((feeData.maxFeePerGas! * 21000n))} ${config.nativeToken}`
          : `~${ethers.formatEther((feeData.gasPrice! * 21000n))} ${config.nativeToken}`,
        note: 'Cost for 21000 gas (simple ETH/native token transfer)'
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
