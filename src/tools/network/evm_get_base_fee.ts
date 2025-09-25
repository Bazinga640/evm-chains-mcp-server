/**
 * Get EIP-1559 base fee per gas
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

export async function handleGetBaseFee(args: {
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

    if (!block.baseFeePerGas) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'EIP-1559 not supported on this chain',
            chain: args.chain,
            network: config.name,
            note: 'This chain uses legacy gas pricing'
          }, null, 2)
        }]
      };
    }

    // Get historical base fees
    const historicalBlocks = await Promise.all([
      provider.getBlock(blockNumber - 1),
      provider.getBlock(blockNumber - 2),
      provider.getBlock(blockNumber - 3),
      provider.getBlock(blockNumber - 4),
      provider.getBlock(blockNumber - 5)
    ]);

    const historicalFees = historicalBlocks
      .filter(b => b !== null && b.baseFeePerGas)
      .map(b => ({
        blockNumber: b!.number,
        baseFee: ethers.formatUnits(b!.baseFeePerGas!, 'gwei'),
        utilization: Number((b!.gasUsed * 10000n) / b!.gasLimit) / 100
      }));

    // Calculate average
    const avgBaseFee = historicalBlocks
      .filter(b => b !== null && b.baseFeePerGas)
      .reduce((sum, b) => sum + Number(ethers.formatUnits(b!.baseFeePerGas!, 'gwei')), 0) / historicalFees.length;

    const currentBaseFee = ethers.formatUnits(block.baseFeePerGas, 'gwei');
    const trend = Number(currentBaseFee) > avgBaseFee ? 'increasing' : Number(currentBaseFee) < avgBaseFee ? 'decreasing' : 'stable';

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      block: {
        number: blockNumber,
        timestamp: new Date(block.timestamp * 1000).toISOString()
      },
      baseFee: {
        current: `${currentBaseFee} gwei`,
        average: `${avgBaseFee.toFixed(4)} gwei`,
        trend,
        percentChange: `${(((Number(currentBaseFee) - avgBaseFee) / avgBaseFee) * 100).toFixed(2)}%`
      },
      history: historicalFees,
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
