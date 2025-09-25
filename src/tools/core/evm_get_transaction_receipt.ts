/**
 * EVM Get Transaction Receipt Tool
 *
 * Get the receipt of a mined transaction
 */

import { z } from 'zod';
import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  txHash: z.string().describe('Transaction hash')
});

export async function handleGetTransactionReceipt(args: z.infer<typeof inputSchema>) {
  const startTime = Date.now();
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);

    const [receipt, tx] = await Promise.all([
      provider.getTransactionReceipt(validated.txHash),
      provider.getTransaction(validated.txHash)
    ]);

    if (!receipt) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'Transaction not found or not yet mined',
            chain: validated.chain,
            txHash: validated.txHash,
            executionTime: `${Date.now() - startTime}ms`
          }, null, 2)
        }]
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          receipt: {
            transactionHash: receipt.hash,
            transactionIndex: receipt.index,
            blockNumber: receipt.blockNumber,
            blockHash: receipt.blockHash,
            from: receipt.from,
            to: receipt.to,
            cumulativeGasUsed: receipt.cumulativeGasUsed.toString(),
            gasUsed: receipt.gasUsed.toString(),
            contractAddress: receipt.contractAddress,
            logs: receipt.logs.map(log => ({
              address: log.address,
              topics: log.topics,
              data: log.data,
              logIndex: log.index,
              blockNumber: log.blockNumber
            })),
            logsBloom: receipt.logsBloom,
            status: receipt.status,
            type: receipt.type,
            effectiveGasPrice: tx?.gasPrice ? ethers.formatUnits(tx.gasPrice, 'gwei') + ' gwei' : null
          },
          executionTime: `${Date.now() - startTime}ms`
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error.message,
          chain: validated.chain,
          txHash: validated.txHash,
          executionTime: `${Date.now() - startTime}ms`
        }, null, 2)
      }]
    };
  }
}
