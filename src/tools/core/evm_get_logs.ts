/**
 * EVM Get Logs Tool
 *
 * Query event logs from the blockchain with filtering
 */

import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  address: z.union([z.string(), z.array(z.string())]).optional().describe('Contract address(es) to filter'),
  topics: z.array(z.union([z.string(), z.array(z.string()), z.null()])).optional().describe('Event topics to filter'),
  fromBlock: z.union([z.number(), z.string()]).optional().describe('Starting block number or tag'),
  toBlock: z.union([z.number(), z.string()]).optional().describe('Ending block number or tag')
});

export async function handleGetLogs(args: z.infer<typeof inputSchema>) {
  const startTime = Date.now();
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);

    const filter: any = {};
    if (validated.address) filter.address = validated.address;
    if (validated.topics) filter.topics = validated.topics;
    if (validated.fromBlock) filter.fromBlock = validated.fromBlock;
    if (validated.toBlock) filter.toBlock = validated.toBlock;

    const logs = await provider.getLogs(filter);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          filter,
          logsCount: logs.length,
          logs: logs.map(log => ({
            address: log.address,
            topics: log.topics,
            data: log.data,
            blockNumber: log.blockNumber,
            blockHash: log.blockHash,
            transactionHash: log.transactionHash,
            transactionIndex: log.transactionIndex,
            logIndex: log.index,
            removed: log.removed
          })),
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
          executionTime: `${Date.now() - startTime}ms`
        }, null, 2)
      }]
    };
  }
}
