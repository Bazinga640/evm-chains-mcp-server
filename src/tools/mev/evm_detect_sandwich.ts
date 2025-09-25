import { ethers } from 'ethers';
import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  transactionHash: z.string().optional().describe('Check if specific tx was sandwiched'),
  blockNumber: z.string().optional().describe('Analyze sandwich attacks in block'),
  victimAddress: z.string().optional().describe('Check if address was sandwich victim'),
  timeWindow: z.number().optional().default(100).describe('Number of recent blocks to analyze')
});

interface SandwichPattern {
  type: 'SANDWICH_ATTACK_DETECTED' | 'POTENTIAL_SANDWICH' | 'HIGH_MEV_BLOCK';
  victim?: string;
  frontrun?: string;
  backrun?: string;
  attacker?: string;
  suspectedBot?: string;
  blockNumber?: number | null;
  transactionCount?: number;
  gasUsed?: {
    frontrun?: string;
    victim?: string;
    backrun?: string;
  };
  profitEstimate?: string;
  recommendation?: string;
}

export async function handleDetectSandwich(args: z.infer<typeof inputSchema>) {
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);

    const sandwichPatterns: SandwichPattern[] = [];

    if (validated.transactionHash) {
      // Analyze specific transaction
      const tx = await provider.getTransaction(validated.transactionHash);
      if (!tx || !tx.blockNumber) {
        throw new Error('Transaction not found or not confirmed');
      }

      const block = await provider.getBlock(tx.blockNumber, true);
      if (!block || !block.prefetchedTransactions) {
        throw new Error('Block not found or does not contain transactions');
      }

      const txIndex = block.prefetchedTransactions.findIndex(t =>
        t.hash.toLowerCase() === validated.transactionHash!.toLowerCase()
      );

      if (txIndex === -1) {
        throw new Error('Transaction not found in block');
      }

      // Check transactions before and after
      const prevTx = txIndex > 0 ? block.prefetchedTransactions[txIndex - 1] : null;
      const nextTx = txIndex < block.prefetchedTransactions.length - 1 ? block.prefetchedTransactions[txIndex + 1] : null;

      // Analyze for sandwich pattern
      if (prevTx && nextTx) {
        // Check if same sender (potential sandwich bot)
        if (prevTx.from === nextTx.from && prevTx.from !== tx.from) {
          // Decode transaction data to check for DEX interactions
          const commonDEXMethods = [
            '0x7ff36ab5', // swapExactETHForTokens
            '0x18cbafe5', // swapExactTokensForETH
            '0x38ed1739', // swapExactTokensForTokens
            '0x8803dbee', // swapTokensForExactTokens
            '0x0b86a4c1', // Uniswap V3 exactInput
            '0x9b2c0a37'  // Uniswap V3 exactOutput
          ];

          const prevMethod = prevTx.data?.slice(0, 10);
          const victimMethod = tx.data?.slice(0, 10);
          const nextMethod = nextTx.data?.slice(0, 10);

          const isDEXInteraction = (method: string | undefined) =>
            method && commonDEXMethods.includes(method);

          if (isDEXInteraction(prevMethod) && isDEXInteraction(victimMethod) && isDEXInteraction(nextMethod)) {
            // High probability of sandwich attack
            sandwichPatterns.push({
              type: 'SANDWICH_ATTACK_DETECTED',
              victim: tx.hash,
              frontrun: prevTx.hash,
              backrun: nextTx.hash,
              attacker: prevTx.from,
              blockNumber: tx.blockNumber,
              gasUsed: {
                frontrun: prevTx.gasLimit?.toString(),
                victim: tx.gasLimit?.toString(),
                backrun: nextTx.gasLimit?.toString()
              },
              profitEstimate: 'Requires transaction trace analysis'
            });
          }
        }
      }

    } else if (validated.blockNumber) {
      // Analyze entire block
      const block = await provider.getBlock(validated.blockNumber, true);
      if (!block || !block.prefetchedTransactions) {
        throw new Error('Block not found or does not contain transactions');
      }

      // Group transactions by sender
      const txBySender: Record<string, ethers.TransactionResponse[]> = {};
      for (const tx of block.prefetchedTransactions) {
        if (!txBySender[tx.from]) {
          txBySender[tx.from] = [];
        }
        txBySender[tx.from].push(tx);
      }

      // Look for addresses with multiple transactions (potential sandwich bots)
      for (const [sender, txs] of Object.entries(txBySender)) {
        if (txs.length >= 2) {
          // Check if transactions bracket other transactions
          const indices = txs.map(tx =>
            block.prefetchedTransactions.findIndex(t => t.hash === tx.hash)
          ).sort((a, b) => a - b);

          // Check if there are victim transactions between
          for (let i = 0; i < indices.length - 1; i++) {
            const gap = indices[i + 1] - indices[i];
            if (gap === 2) {
              // Exactly one transaction between - potential sandwich
              const victimIndex = indices[i] + 1;
              const victimTx = block.prefetchedTransactions[victimIndex];

              sandwichPatterns.push({
                type: 'POTENTIAL_SANDWICH',
                suspectedBot: sender,
                frontrun: txs[i].hash,
                victim: victimTx.hash,
                backrun: txs[i + 1].hash,
                blockNumber: block.number
              });
            }
          }
        }
      }

    } else {
      // Analyze recent blocks
      const currentBlock = await provider.getBlockNumber();
      const startBlock = currentBlock - validated.timeWindow;

      for (let blockNum = startBlock; blockNum <= currentBlock; blockNum++) {
        try {
          const block = await provider.getBlock(blockNum, true);
          if (!block || !block.prefetchedTransactions) continue;

          // Quick heuristic: blocks with high transaction count more likely to have MEV
          if (block.prefetchedTransactions.length > 50) {
            // Sample analysis for demonstration
            sandwichPatterns.push({
              type: 'HIGH_MEV_BLOCK',
              blockNumber: blockNum,
              transactionCount: block.prefetchedTransactions.length,
              recommendation: 'Detailed analysis recommended'
            });
          }
        } catch (e) {
          // Skip blocks that can't be fetched
          continue;
        }
      }
    }

    // Calculate statistics
    const stats = {
      blocksAnalyzed: validated.timeWindow || 1,
      sandwichAttacksDetected: sandwichPatterns.filter(p => p.type === 'SANDWICH_ATTACK_DETECTED').length,
      potentialSandwiches: sandwichPatterns.filter(p => p.type === 'POTENTIAL_SANDWICH').length,
      highMEVBlocks: sandwichPatterns.filter(p => p.type === 'HIGH_MEV_BLOCK').length
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          analysisType: validated.transactionHash ? 'Transaction' :
                       validated.blockNumber ? 'Block' : 'Time Window',
          statistics: stats,
          detectedPatterns: sandwichPatterns,
          protectionRecommendations: [
            'Use private mempools (Flashbots)',
            'Set high slippage protection',
            'Split large trades into smaller chunks',
            'Use MEV-protected DEX aggregators',
            'Consider using commit-reveal schemes'
          ],
          mevProtectionTools: {
            ethereum: 'Flashbots Protect RPC',
            polygon: 'High priority gas',
            bsc: 'MEV-resistant DEXs',
            arbitrum: 'Fair sequencing'
          },
          note: 'Full MEV analysis requires transaction traces and mempool data'
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
          suggestion: 'Ensure valid transaction hash or block number'
        }, null, 2)
      }]
    };
  }
}