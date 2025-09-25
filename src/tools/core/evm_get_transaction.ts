/**
 * Get transaction details for any EVM chain
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

export async function handleGetTransaction(args: {
  chain: string;
  txHash: string;
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

    // Get transaction and receipt
    const [tx, receipt] = await Promise.all([
      provider.getTransaction(args.txHash),
      provider.getTransactionReceipt(args.txHash)
    ]);

    if (!tx) {
      throw new Error(`Transaction not found: ${args.txHash}`);
    }

    // Get block for timestamp
    const block = tx.blockNumber ? await provider.getBlock(tx.blockNumber) : null;

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      transaction: {
        hash: tx.hash,
        from: tx.from,
        to: tx.to || null,
        value: {
          wei: tx.value.toString(),
          ether: ethers.formatEther(tx.value),
          formatted: `${ethers.formatEther(tx.value)} ${config.nativeToken}`
        },
        gasLimit: tx.gasLimit.toString(),
        gasPrice: tx.gasPrice ? ethers.formatUnits(tx.gasPrice, 'gwei') + ' gwei' : null,
        maxFeePerGas: tx.maxFeePerGas ? ethers.formatUnits(tx.maxFeePerGas, 'gwei') + ' gwei' : null,
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? ethers.formatUnits(tx.maxPriorityFeePerGas, 'gwei') + ' gwei' : null,
        nonce: tx.nonce,
        data: tx.data,
        chainId: Number(tx.chainId),
        type: tx.type,
        blockNumber: tx.blockNumber,
        blockHash: tx.blockHash,
        timestamp: block?.timestamp ? new Date(block.timestamp * 1000).toISOString() : null
      },
      receipt: receipt ? {
        status: receipt.status === 1 ? 'success' : 'failed',
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: tx.gasPrice ? ethers.formatUnits(tx.gasPrice, 'gwei') + ' gwei' : null,
        cumulativeGasUsed: receipt.cumulativeGasUsed.toString(),
        contractAddress: receipt.contractAddress || null,
        logs: receipt.logs.length,
        confirmations: await tx.confirmations()
      } : null,
      explorer: clientManager.getTransactionExplorerUrl(args.chain, args.txHash),
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
      txHash: args.txHash,
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
