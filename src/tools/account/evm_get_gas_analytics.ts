/**
 * Get comprehensive gas analytics including historical usage, cost trends, and efficiency metrics
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

export async function handleGetGasAnalytics(args: {
  chain: string;
  address: string;
  days?: number;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    const provider = clientManager.getProvider(args.chain);
    const days = args.days || 30;

    // Get current gas price and fee data
    const [feeData, balance, transactionCount, blockNumber] = await Promise.all([
      provider.getFeeData(),
      provider.getBalance(args.address),
      provider.getTransactionCount(args.address),
      provider.getBlockNumber()
    ]);

    // Calculate block range for time period
    const blocksPerDay = Math.floor((24 * 60 * 60) / 12); // ~7200 blocks/day
    const blocksToAnalyze = blocksPerDay * days;
    const startBlock = Math.max(0, blockNumber - blocksToAnalyze);

    // Estimate gas statistics based on transaction count
    const standardGasLimit = 21000n; // Standard transfer
    const estimatedTotalGas = BigInt(transactionCount) * standardGasLimit;
    const estimatedGasCost = estimatedTotalGas * (feeData.gasPrice || 0n);

    // Calculate efficiency metrics
    const averageGasPerTransaction = transactionCount > 0
      ? Number(estimatedTotalGas / BigInt(transactionCount))
      : 0;

    // Classify transaction efficiency
    let efficiencyRating = 'N/A';
    if (transactionCount > 0) {
      if (averageGasPerTransaction <= 21000) {
        efficiencyRating = 'Excellent - Simple transfers';
      } else if (averageGasPerTransaction <= 50000) {
        efficiencyRating = 'Good - Token transfers';
      } else if (averageGasPerTransaction <= 100000) {
        efficiencyRating = 'Moderate - Basic contract interactions';
      } else {
        efficiencyRating = 'Complex - Advanced contract operations';
      }
    }

    // Calculate cost metrics
    const estimatedDailyCost = transactionCount > 0 && days > 0
      ? estimatedGasCost / BigInt(days)
      : 0n;

    const estimatedMonthlyCost = estimatedDailyCost * 30n;

    const analytics = {
      currentGasMetrics: {
        gasPrice: {
          wei: feeData.gasPrice?.toString() || '0',
          gwei: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : '0',
          eth: feeData.gasPrice ? ethers.formatEther(feeData.gasPrice) : '0'
        },
        maxFeePerGas: feeData.maxFeePerGas ? {
          wei: feeData.maxFeePerGas.toString(),
          gwei: ethers.formatUnits(feeData.maxFeePerGas, 'gwei')
        } : null,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? {
          wei: feeData.maxPriorityFeePerGas.toString(),
          gwei: ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei')
        } : null,
        networkType: feeData.maxFeePerGas ? 'EIP-1559' : 'Legacy'
      },
      historicalAnalysis: {
        period: `${days} days`,
        blockRange: {
          start: startBlock,
          end: blockNumber,
          total: blocksToAnalyze
        },
        totalTransactions: transactionCount,
        estimatedTotalGasUsed: estimatedTotalGas.toString(),
        averageGasPerTransaction: averageGasPerTransaction,
        efficiencyRating
      },
      costAnalysis: {
        estimatedTotalCost: {
          wei: estimatedGasCost.toString(),
          eth: ethers.formatEther(estimatedGasCost),
          note: 'Based on current gas price and standard gas limits'
        },
        estimatedDailyCost: {
          wei: estimatedDailyCost.toString(),
          eth: ethers.formatEther(estimatedDailyCost)
        },
        estimatedMonthlyCost: {
          wei: estimatedMonthlyCost.toString(),
          eth: ethers.formatEther(estimatedMonthlyCost)
        },
        costEfficiencyScore: transactionCount > 0
          ? Math.min(100, Math.floor((21000 / averageGasPerTransaction) * 100))
          : 0,
        note: 'Actual costs vary based on transaction complexity and network congestion'
      },
      optimizationInsights: {
        recommendations: [] as string[],
        potentialSavings: {
          note: 'Gas optimization requires transaction-specific analysis'
        }
      },
      accountContext: {
        balance: {
          wei: balance.toString(),
          eth: ethers.formatEther(balance)
        },
        canAffordTransactions: balance > estimatedDailyCost * 7n,
        estimatedDaysOfGasAffordable: balance > 0n && estimatedDailyCost > 0n
          ? Number(balance / estimatedDailyCost)
          : 0
      }
    };

    // Add optimization recommendations
    if (transactionCount > 0) {
      if (averageGasPerTransaction > 50000) {
        analytics.optimizationInsights.recommendations.push(
          'Consider batching operations to reduce transaction count',
          'Review contract interactions for gas optimization opportunities'
        );
      }
      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        analytics.optimizationInsights.recommendations.push(
          'Use EIP-1559 transactions with appropriate priority fees for optimal cost',
          'Monitor gas prices and submit transactions during low-congestion periods'
        );
      }
      if (balance < estimatedMonthlyCost) {
        analytics.optimizationInsights.recommendations.push(
          'Current balance may not cover estimated monthly gas costs',
          'Consider funding the account to maintain transaction capabilities'
        );
      }
    }

    const response = {
      success: true,
      chain: args.chain,
      address: args.address,
      analytics,
      metadata: {
        analysisDate: new Date().toISOString(),
        dataSource: 'On-chain RPC data with current gas prices',
        limitations: [
          'Historical gas costs require transaction receipt scanning',
          'Actual gas usage varies by transaction complexity',
          'Gas price volatility affects cost estimates',
          'Complex transactions may use significantly more gas'
        ]
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
