import { ethers } from 'ethers';
import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  contractAddress: z.string().describe('Contract address to filter logs from'),
  topics: z.array(z.string().nullable()).optional().describe('Event topics to filter'),
  fromBlock: z.union([z.number(), z.literal('latest'), z.literal('earliest')]).optional().default('latest'),
  toBlock: z.union([z.number(), z.literal('latest')]).optional().default('latest'),
  eventSignature: z.string().optional().describe('Event signature like Transfer(address,address,uint256)'),
  decodeData: z.boolean().optional().default(true).describe('Decode log data'),
  limit: z.number().optional().default(100).describe('Maximum logs to return')
});

export async function handleFilterLogs(args: z.infer<typeof inputSchema>) {
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);

    // Build filter
    const filter: any = {
      address: validated.contractAddress
    };

    // Handle block range
    if (validated.fromBlock === 'latest' && validated.toBlock === 'latest') {
      const currentBlock = await provider.getBlockNumber();
      filter.fromBlock = currentBlock - 100; // Last 100 blocks by default
      filter.toBlock = currentBlock;
    } else {
      filter.fromBlock = validated.fromBlock;
      filter.toBlock = validated.toBlock;
    }

    // Add topics if provided
    if (validated.topics && validated.topics.length > 0) {
      filter.topics = validated.topics;
    } else if (validated.eventSignature) {
      // Generate topic from event signature
      const eventTopic = ethers.id(validated.eventSignature);
      filter.topics = [eventTopic];
    }

    // Get logs
    const logs = await provider.getLogs(filter);
    const limitedLogs = logs.slice(0, validated.limit);

    // Process and decode logs
    const processedLogs = await Promise.all(limitedLogs.map(async (log) => {
      const block = await provider.getBlock(log.blockNumber);

      const processedLog: any = {
        blockNumber: log.blockNumber,
        blockHash: log.blockHash,
        timestamp: block?.timestamp,
        transactionHash: log.transactionHash,
        transactionIndex: log.transactionIndex,
        logIndex: log.index,
        address: log.address,
        topics: log.topics,
        data: log.data,
        removed: log.removed
      };

      // Decode common events
      if (validated.decodeData && log.topics.length > 0) {
        const eventSignatures: Record<string, string> = {
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef': 'Transfer',
          '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925': 'Approval',
          '0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c': 'Deposit',
          '0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65': 'Withdrawal',
          '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822': 'Swap',
          '0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f': 'Mint',
          '0xcc16f5dbb4873280815c1ee09dbd06736cffcc184412cf7a71a0fdb75d397ca5': 'Burn'
        };

        const eventName = eventSignatures[log.topics[0]];
        if (eventName) {
          processedLog.eventName = eventName;

          // Decode based on event type
          if (eventName === 'Transfer' && log.topics.length >= 3) {
            processedLog.decoded = {
              from: ethers.getAddress('0x' + log.topics[1].slice(26)),
              to: ethers.getAddress('0x' + log.topics[2].slice(26)),
              value: log.data !== '0x' ? ethers.formatUnits(log.data, 18) : '0'
            };
          } else if (eventName === 'Approval' && log.topics.length >= 3) {
            processedLog.decoded = {
              owner: ethers.getAddress('0x' + log.topics[1].slice(26)),
              spender: ethers.getAddress('0x' + log.topics[2].slice(26)),
              value: log.data !== '0x' ? ethers.formatUnits(log.data, 18) : '0'
            };
          }
        }
      }

      return processedLog;
    }));

    // Calculate statistics
    const stats = {
      totalLogs: logs.length,
      returned: processedLogs.length,
      blockRange: `${filter.fromBlock} to ${filter.toBlock}`,
      uniqueTransactions: new Set(processedLogs.map(l => l.transactionHash)).size,
      eventTypes: processedLogs.reduce((acc, log) => {
        const event = log.eventName || 'Unknown';
        acc[event] = (acc[event] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          contractAddress: validated.contractAddress,
          stats,
          logs: processedLogs,
          filter: {
            fromBlock: filter.fromBlock,
            toBlock: filter.toBlock,
            topics: filter.topics
          },
          note: logs.length > validated.limit ? `Showing first ${validated.limit} of ${logs.length} logs` : undefined
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error.message,
          chain: validated.chain,
          contractAddress: validated.contractAddress,
          suggestion: 'Check contract address and block range. Large ranges may timeout.'
        }, null, 2)
      }]
    };
  }
}