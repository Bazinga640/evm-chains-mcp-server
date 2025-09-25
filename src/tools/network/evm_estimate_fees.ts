/**
 * Estimate transaction cost with detailed breakdown
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

export async function handleEstimateFees(args: {
  chain: string;
  from: string;
  to: string;
  value?: string;
  data?: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    const config = clientManager.getChainConfig(args.chain);
    const provider = clientManager.getProvider(args.chain);

    const fromAddress = clientManager.getChecksumAddress(args.from);
    const toAddress = clientManager.getChecksumAddress(args.to);

    // Build transaction object
    const tx: any = {
      from: fromAddress,
      to: toAddress
    };

    if (args.value) {
      tx.value = ethers.parseEther(args.value);
    }

    if (args.data) {
      tx.data = args.data;
    }

    // Estimate gas
    const gasEstimate = await provider.estimateGas(tx);
    const feeData = await provider.getFeeData();

    // Calculate costs
    let estimatedCost: string;
    let costBreakdown: any;

    if (feeData.maxFeePerGas) {
      // EIP-1559
      const maxCost = gasEstimate * feeData.maxFeePerGas;
      estimatedCost = ethers.formatEther(maxCost);
      costBreakdown = {
        gasLimit: gasEstimate.toString(),
        maxFeePerGas: ethers.formatUnits(feeData.maxFeePerGas, 'gwei'),
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei') : 'N/A',
        maxCost: estimatedCost
      };
    } else if (feeData.gasPrice) {
      // Legacy
      const cost = gasEstimate * feeData.gasPrice;
      estimatedCost = ethers.formatEther(cost);
      costBreakdown = {
        gasLimit: gasEstimate.toString(),
        gasPrice: ethers.formatUnits(feeData.gasPrice, 'gwei'),
        estimatedCost
      };
    } else {
      throw new Error('Unable to fetch fee data');
    }

    // Add 10% buffer for safety
    const gasWithBuffer = (gasEstimate * 110n) / 100n;

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      transaction: {
        from: fromAddress,
        to: toAddress,
        value: args.value ? `${args.value} ETH` : '0 ETH',
        hasData: !!args.data
      },
      gasEstimate: {
        estimated: gasEstimate.toString(),
        recommended: gasWithBuffer.toString(),
        buffer: '10%'
      },
      cost: costBreakdown,
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
      executionTime: `${Date.now() - startTime}ms`,
      troubleshooting: {
        'insufficient funds': 'From address does not have enough balance',
        'execution reverted': 'Transaction would fail - check contract logic',
        'invalid opcode': 'Invalid transaction data'
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
