/**
 * Estimate gas required for a transaction on any EVM chain
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

export async function handleEstimateGas(args: {
  chain: string;
  from?: string;
  to: string;
  value?: string;
  data?: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    // Validate inputs
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    if (!clientManager.isValidAddress(args.to)) {
      throw new Error(`Invalid 'to' address: ${args.to}`);
    }

    if (args.from && !clientManager.isValidAddress(args.from)) {
      throw new Error(`Invalid 'from' address: ${args.from}`);
    }

    // Get provider and config
    const provider = clientManager.getProvider(args.chain);
    const config = clientManager.getChainConfig(args.chain);

    // Build transaction object
    const tx: any = {
      to: clientManager.getChecksumAddress(args.to),
    };

    if (args.from) {
      tx.from = clientManager.getChecksumAddress(args.from);
    }

    if (args.value) {
      tx.value = ethers.parseEther(args.value);
    }

    if (args.data) {
      tx.data = args.data;
    }

    // Estimate gas
    const gasEstimate = await provider.estimateGas(tx);

    // Get current gas price for cost estimation
    const feeData = await provider.getFeeData();

    // Add 20% buffer for safety
    const gasWithBuffer = (gasEstimate * 120n) / 100n;

    // Calculate costs
    const isEIP1559 = feeData.maxFeePerGas !== null;
    const gasPrice = isEIP1559 ? feeData.maxFeePerGas! : feeData.gasPrice!;

    const estimatedCost = gasEstimate * gasPrice;
    const estimatedCostWithBuffer = gasWithBuffer * gasPrice;

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      transaction: {
        from: tx.from || 'not specified',
        to: tx.to,
        value: args.value ? `${args.value} ${config.nativeToken}` : '0',
        hasData: !!args.data,
        dataSize: args.data ? (args.data.length - 2) / 2 + ' bytes' : '0 bytes'
      },
      gasEstimate: {
        estimated: gasEstimate.toString(),
        recommended: gasWithBuffer.toString(),
        buffer: '20% added for safety'
      },
      currentGasPrice: isEIP1559 ? {
        maxFeePerGas: ethers.formatUnits(feeData.maxFeePerGas!, 'gwei') + ' gwei',
        maxPriorityFeePerGas: ethers.formatUnits(feeData.maxPriorityFeePerGas!, 'gwei') + ' gwei'
      } : {
        gasPrice: ethers.formatUnits(feeData.gasPrice!, 'gwei') + ' gwei'
      },
      estimatedCost: {
        withEstimatedGas: {
          wei: estimatedCost.toString(),
          ether: ethers.formatEther(estimatedCost),
          formatted: `${ethers.formatEther(estimatedCost)} ${config.nativeToken}`
        },
        withRecommendedGas: {
          wei: estimatedCostWithBuffer.toString(),
          ether: ethers.formatEther(estimatedCostWithBuffer),
          formatted: `${ethers.formatEther(estimatedCostWithBuffer)} ${config.nativeToken}`
        }
      },
      note: 'Recommended gas includes 20% buffer to account for price fluctuations',
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
      transaction: {
        to: args.to,
        from: args.from || 'not specified',
        value: args.value || '0'
      },
      timestamp: new Date().toISOString(),
      executionTime: `${Date.now() - startTime}ms`,
      troubleshooting: {
        'execution reverted': 'Transaction would fail - check contract logic and parameters',
        'insufficient funds': 'From address does not have enough balance',
        'invalid opcode': 'Contract code contains errors or unsupported operations'
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
