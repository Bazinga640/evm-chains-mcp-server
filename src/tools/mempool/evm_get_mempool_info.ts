import { ethers } from 'ethers';
import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';
import { buildSuccessResponse, buildErrorResponse } from '../../utils/responses.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  filter: z.object({
    minValue: z.string().optional().describe('Minimum transaction value in ETH'),
    to: z.string().optional().describe('Filter by recipient address'),
    from: z.string().optional().describe('Filter by sender address'),
    minGasPrice: z.string().optional().describe('Minimum gas price in gwei')
  }).optional(),
  limit: z.number().optional().default(100).describe('Maximum number of transactions to return'),
  includeDetails: z.boolean().optional().describe('Include full transaction details')
});

export async function handleGetMempoolInfo(args: z.infer<typeof inputSchema>) {
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);
    const wsProvider = clientManager.getWebSocketProvider(validated.chain);

    if (!wsProvider) {
      return buildErrorResponse({
        chain: validated.chain,
        error: 'WebSocket provider not configured for mempool access',
        reason: 'Standard HTTP RPC endpoints do not expose pending transactions',
        alternatives: [
          `Set MEMPOOL_WS_${validated.chain.toUpperCase()}_URL in your environment (wss://...)`,
          'Use a dedicated mempool service (Blocknative, Eden, Flashbots searcher API)',
          'Query recent blocks instead of pending transactions'
        ],
        suggestion: 'Configure a WebSocket RPC URL to enable mempool monitoring.',
        note: 'This tool requires WebSocket support or txpool_ RPC methods.'
      });
    }

    let pendingBlock;
    try {
      pendingBlock = await wsProvider.getBlock('pending', true);
    } catch {
      pendingBlock = null;
    } finally {
      // Keep pooled WS open for reuse; if consumer wants to close, they can call destroy via manager
    }

    if (!pendingBlock || !pendingBlock.transactions || pendingBlock.transactions.length === 0) {
      return buildErrorResponse({
        chain: validated.chain,
        error: 'Pending block data is unavailable from the configured WebSocket RPC.',
        suggestion: 'Verify that the provider supports pending block subscriptions.'
      });
    }

    // If we got pending block, process it
    const pendingTxs: any[] = [];

    // Extract transactions from pending block
    for (const tx of pendingBlock.transactions) {
      if (typeof tx === 'string') {
        // Transaction hash only, need to fetch details
        try {
          const txDetails = await provider.getTransaction(tx);
          if (txDetails) {
            pendingTxs.push(txDetails);
          }
        } catch (e) {
          // Skip failed fetches
        }
      } else {
        // Full transaction object
        pendingTxs.push(tx);
      }
    }

    // Apply filters
    let filteredTxs = pendingTxs;

    if (validated.filter) {
      filteredTxs = pendingTxs.filter(tx => {
        if (validated.filter?.minValue && tx.value) {
          const minVal = ethers.parseEther(validated.filter.minValue);
          if (tx.value < minVal) return false;
        }
        if (validated.filter?.to && tx.to !== validated.filter.to) return false;
        if (validated.filter?.from && tx.from !== validated.filter.from) return false;
        if (validated.filter?.minGasPrice) {
          const minGas = ethers.parseUnits(validated.filter.minGasPrice, 'gwei');
          if ((tx.gasPrice || tx.maxFeePerGas || 0n) < minGas) return false;
        }
        return true;
      });
    }

    // Format transactions
    const formattedTxs = filteredTxs.map(tx => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: ethers.formatEther(tx.value),
      gasPrice: tx.gasPrice ? ethers.formatUnits(tx.gasPrice, 'gwei') : null,
      maxFeePerGas: tx.maxFeePerGas ? ethers.formatUnits(tx.maxFeePerGas, 'gwei') : null,
      maxPriorityFee: tx.maxPriorityFeePerGas ? ethers.formatUnits(tx.maxPriorityFeePerGas, 'gwei') : null,
      gasLimit: tx.gasLimit?.toString(),
      nonce: tx.nonce,
      data: validated.includeDetails ? tx.data : (tx.data.length > 10 ? '0x...' : tx.data),
      type: tx.type,
      chainId: tx.chainId?.toString()
    }));

    // MEV opportunities detection
    const mevOpportunities = [];

    // Check for potential arbitrage (same sender, multiple DEX interactions)
    const dexAddresses = ['0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'];
    const dexTxs = formattedTxs.filter(tx => tx.to && dexAddresses.includes(tx.to));
    if (dexTxs.length > 1) {
      mevOpportunities.push({
        type: 'Potential Arbitrage',
        transactions: dexTxs.length,
        description: 'Multiple DEX interactions detected'
      });
    }

    // Check for large transactions (potential sandwich targets)
    const largeTxs = formattedTxs.filter(tx => parseFloat(tx.value) > 10);
    if (largeTxs.length > 0) {
      mevOpportunities.push({
        type: 'Sandwich Targets',
        count: largeTxs.length,
        totalValue: largeTxs.reduce((sum, tx) => sum + parseFloat(tx.value), 0).toFixed(4)
      });
    }

    // Limit results
    const limitedTxs = filteredTxs.slice(0, validated.limit);

    return buildSuccessResponse({
      chain: validated.chain,
      source: 'pending block',
      mempoolSize: limitedTxs.length,
      totalPending: pendingTxs.length,
      filtered: pendingTxs.length - filteredTxs.length,
      transactions: limitedTxs,
      statistics: {
        averageGasPrice: limitedTxs.length > 0
          ? (limitedTxs.reduce((sum, tx) => sum + parseFloat(tx.gasPrice || tx.maxFeePerGas || '0'), 0) / limitedTxs.length).toFixed(2) + ' gwei'
          : '0 gwei',
        totalValue: limitedTxs.reduce((sum, tx) => sum + parseFloat(tx.value), 0).toFixed(4) + ' ETH',
        uniqueSenders: new Set(limitedTxs.map(tx => tx.from)).size,
        contractCalls: limitedTxs.filter(tx => tx.data !== '0x').length
      },
      mevOpportunities,
      note: 'Pending transactions from pending block - may not represent full mempool on all chains',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return buildErrorResponse({
      error: error.message,
      chain: validated.chain,
      note: 'Mempool access may be limited on some chains/providers'
    });
  }
}
