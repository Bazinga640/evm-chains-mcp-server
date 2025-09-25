import { ethers } from 'ethers';
import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

const inputSchema = z.object({
  sourceChain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'optimism', 'worldchain']),
  targetChain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'optimism', 'worldchain']),
  transactionHash: z.string().describe('Source chain transaction hash'),
  bridgeProtocol: z.string().optional().describe('Bridge protocol used'),
  userAddress: z.string().optional().describe('User address for destination monitoring')
});

interface BridgePhase {
  phase: string;
  status: 'completed' | 'pending' | 'failed';
  timestamp?: string;
  transactionHash?: string;
  confirmations?: number;
  details?: any;
}

export async function handleTrackBridgeProgress(args: z.infer<typeof inputSchema>) {
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const sourceProvider = clientManager.getProvider(validated.sourceChain);
    const targetProvider = clientManager.getProvider(validated.targetChain);

    const phases: BridgePhase[] = [];

    // Phase 1: Check source transaction
    const sourceTx = await sourceProvider.getTransaction(validated.transactionHash);
    if (!sourceTx) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'Transaction not found on source chain',
            sourceChain: validated.sourceChain,
            transactionHash: validated.transactionHash
          }, null, 2)
        }]
      };
    }

    const sourceReceipt = await sourceProvider.getTransactionReceipt(validated.transactionHash);
    const currentSourceBlock = await sourceProvider.getBlockNumber();

    phases.push({
      phase: 'SOURCE_TRANSACTION',
      status: sourceReceipt ? 'completed' : 'pending',
      timestamp: new Date().toISOString(),
      transactionHash: validated.transactionHash,
      confirmations: sourceReceipt ? currentSourceBlock - sourceReceipt.blockNumber : 0,
      details: {
        blockNumber: sourceReceipt?.blockNumber,
        gasUsed: sourceReceipt?.gasUsed?.toString(),
        status: sourceReceipt?.status === 1 ? 'Success' : sourceReceipt?.status === 0 ? 'Failed' : 'Pending'
      }
    });

    // Phase 2: Check for bridge events in source transaction
    if (sourceReceipt && sourceReceipt.status === 1) {
      const bridgeEvents = [
        '0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c', // Deposit
        '0x4dfe1bbbcf077ddc3e01291eea2d5c70c2b422b415d95645b9adcfd678cb1d63', // MessageSent
        '0xc1d1490cf25c3b40d600dfb27c7680340ed1ab901b7e8f3551280968a3b372b0', // BridgeInitiated
      ];

      const detectedBridgeEvent = sourceReceipt.logs.some(log =>
        bridgeEvents.includes(log.topics[0])
      );

      phases.push({
        phase: 'BRIDGE_INITIATED',
        status: detectedBridgeEvent ? 'completed' : 'pending',
        timestamp: new Date().toISOString(),
        details: {
          eventsDetected: detectedBridgeEvent,
          logCount: sourceReceipt.logs.length
        }
      });

      // Phase 3: Monitor for state root submission (for optimistic rollups)
      if (['arbitrum', 'optimism', 'base'].includes(validated.sourceChain) &&
          validated.targetChain === 'ethereum') {
        phases.push({
          phase: 'STATE_ROOT_SUBMISSION',
          status: 'pending',
          details: {
            estimatedTime: '1-2 hours',
            description: 'Waiting for state root to be submitted to L1'
          }
        });

        phases.push({
          phase: 'CHALLENGE_PERIOD',
          status: 'pending',
          details: {
            duration: '7 days',
            description: 'Fraud proof challenge window',
            canFinalize: false
          }
        });
      }

      // Phase 4: Check destination chain for arrival
      if (validated.userAddress) {
        // Monitor user balance changes on destination
        const destinationBalance = await targetProvider.getBalance(validated.userAddress);

        // Look for recent transfers to user on destination chain
        const filter = {
          address: validated.userAddress,
          fromBlock: Math.max(0, currentSourceBlock - 1000), // Last 1000 blocks
          toBlock: 'latest'
        };

        try {
          const logs = await targetProvider.getLogs(filter);
          const hasRecentActivity = logs.length > 0;

          phases.push({
            phase: 'DESTINATION_ARRIVAL',
            status: hasRecentActivity ? 'completed' : 'pending',
            details: {
              currentBalance: ethers.formatEther(destinationBalance),
              recentActivity: hasRecentActivity,
              logsFound: logs.length
            }
          });
        } catch (e) {
          phases.push({
            phase: 'DESTINATION_ARRIVAL',
            status: 'pending',
            details: {
              currentBalance: ethers.formatEther(destinationBalance),
              note: 'Monitoring for arrival'
            }
          });
        }
      }

      // Phase 5: Finalization (if applicable)
      const needsFinalization = ['arbitrum', 'optimism', 'base'].includes(validated.sourceChain) &&
                                validated.targetChain === 'ethereum';

      if (needsFinalization) {
        phases.push({
          phase: 'FINALIZATION',
          status: 'pending',
          details: {
            available: false,
            estimatedAvailable: 'After 7-day challenge period',
            action: 'User must call finalization transaction'
          }
        });
      }
    }

    // Calculate overall progress
    const completedPhases = phases.filter(p => p.status === 'completed').length;
    const totalPhases = phases.length;
    const progressPercentage = Math.round((completedPhases / totalPhases) * 100);

    // Estimate remaining time
    let estimatedCompletion = 'Unknown';
    if (phases[0].status === 'pending') {
      estimatedCompletion = '1-5 minutes for confirmation';
    } else if (phases[1]?.status === 'completed' && phases[phases.length - 1].status === 'pending') {
      const route = `${validated.sourceChain}-${validated.targetChain}`;
      const estimates: Record<string, string> = {
        'ethereum-polygon': '20-30 minutes',
        'ethereum-arbitrum': '10-15 minutes',
        'polygon-ethereum': '3-4 hours',
        'arbitrum-ethereum': '7 days',
        'optimism-ethereum': '7 days',
        default: '15-60 minutes'
      };
      estimatedCompletion = estimates[route] || estimates.default;
    }

    // Generate actionable next steps
    const nextSteps: string[] = [];
    const currentPhase = phases.find(p => p.status === 'pending');

    if (currentPhase) {
      switch (currentPhase.phase) {
        case 'SOURCE_TRANSACTION':
          nextSteps.push('Wait for transaction confirmation on source chain');
          break;
        case 'BRIDGE_INITIATED':
          nextSteps.push('Bridge is processing your transfer');
          break;
        case 'CHALLENGE_PERIOD':
          nextSteps.push('Wait for 7-day challenge period to complete');
          nextSteps.push('Note the date when you can finalize');
          break;
        case 'DESTINATION_ARRIVAL':
          nextSteps.push('Monitor destination wallet for token arrival');
          nextSteps.push('Check bridge explorer for status updates');
          break;
        case 'FINALIZATION':
          nextSteps.push('Execute finalization transaction after challenge period');
          break;
      }
    }

    // Add monitoring URLs
    const monitoringUrls: Record<string, string> = {
      layerzero: `https://layerzeroscan.com/tx/${validated.transactionHash}`,
      socket: `https://socketscan.io/tx/${validated.transactionHash}`,
      hop: `https://app.hop.exchange/#/tx/${validated.transactionHash}`,
      stargate: `https://stargate.finance/transfer`,
      across: `https://across.to/transactions`,
      etherscan: `https://etherscan.io/tx/${validated.transactionHash}`
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          bridgeRoute: `${validated.sourceChain} → ${validated.targetChain}`,
          overallProgress: `${progressPercentage}%`,
          phases,
          currentStatus: phases[phases.length - 1].status === 'completed' ?
            'BRIDGE_COMPLETE' :
            currentPhase?.phase || 'MONITORING',
          estimatedCompletion,
          nextSteps,
          monitoringUrls: Object.entries(monitoringUrls).reduce((acc, [name, url]) => {
            if (validated.bridgeProtocol?.toLowerCase().includes(name) || name === 'etherscan') {
              acc[name] = url;
            }
            return acc;
          }, {} as Record<string, string>),
          securityReminders: [
            'Never share your private keys',
            'Verify destination address matches your wallet',
            'Keep transaction hash for support tickets',
            sourceReceipt?.status === 0 ? 'TRANSACTION FAILED - Funds are safe' : null
          ].filter(Boolean)
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error.message,
          sourceChain: validated.sourceChain,
          targetChain: validated.targetChain,
          transactionHash: validated.transactionHash,
          suggestion: 'Ensure transaction hash is valid and chains are accessible'
        }, null, 2)
      }]
    };
  }
}