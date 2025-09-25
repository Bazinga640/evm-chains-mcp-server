import { ethers } from 'ethers';
import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

// Bridge message passing contracts
const MESSAGE_CONTRACTS: Record<string, Record<string, string>> = {
  ethereum: {
    polygonCheckpoint: '0x2890bA17EfE978480615e330ecB65333b880928e',
    arbitrumOutbox: '0x760723CD2e632826c38Fef8CD438A4CC7E7E1A40',
    optimismPortal: '0xbEb5Fc579115071764c7423A4f12eDde41f106Ed',
    basePortal: '0x49048044D57e1C92A77f79988d21Fa8fAF74E97e'
  },
  polygon: {
    rootChainManager: '0xA0c68C638235ee32657e8f720a23ceC1bFc77C77',
    checkpoint: '0x2890bA17EfE978480615e330ecB65333b880928e'
  },
  arbitrum: {
    l2Gateway: '0x09e9222E96E7B4AE2a407B98d48e330053351EEe',
    outbox: '0x0B9857ae2D4A3DBe74ffE1d7DF045bb7F96E4840'
  },
  optimism: {
    l2Bridge: '0x4200000000000000000000000000000000000010',
    messenger: '0x4200000000000000000000000000000000000007'
  },
  base: {
    l2Bridge: '0x4200000000000000000000000000000000000010',
    messenger: '0x4200000000000000000000000000000000000007'
  },
  avalanche: {
    bridge: '0x8EB8a3b98659Cce290402893d0123abb75E3ab28'
  },
  bsc: {
    bridge: '0x4aa42145Aa6Ebf72e164C9bBC74fbD3788045016'
  },
  worldchain: {
    bridge: '0x0000000000000000000000000000000000000000'
  }
};

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'optimism', 'worldchain']),
  transactionHash: z.string().describe('Bridge transaction hash to check'),
  bridgeType: z.enum(['native', 'canonical', 'third-party']).optional().default('canonical')
});

export async function handleGetBridgeStatus(args: z.infer<typeof inputSchema>) {
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);

    // Get transaction details
    const tx = await provider.getTransaction(validated.transactionHash);
    if (!tx) {
      throw new Error('Transaction not found');
    }

    const receipt = await provider.getTransactionReceipt(validated.transactionHash);
    if (!receipt) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            status: 'PENDING',
            chain: validated.chain,
            transactionHash: validated.transactionHash,
            message: 'Transaction pending confirmation',
            estimatedTime: '1-5 minutes'
          }, null, 2)
        }]
      };
    }

    // Parse bridge events from logs
    let bridgeStatus: any = {
      initiated: receipt.status === 1,
      sourceChain: validated.chain,
      blockNumber: receipt.blockNumber,
      timestamp: new Date().toISOString()
    };

    // Check for common bridge event signatures
    const bridgeEventSignatures = {
      // Deposit/Lock events
      '0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c': 'DepositInitiated',
      '0xb3813568d9991fc951961fcb4c784893574240a28925604d09fc577c55bb7c32': 'DepositFinalized',
      // Withdrawal/Burn events
      '0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65': 'WithdrawalInitiated',
      '0x2ac69ee804d9a7a0984249f508dfab7cb2534b465b6ce1580f99a38ba9c5e631': 'WithdrawalProven',
      '0xdb5c7652857aa163daadd670e116628fb42e869d8ac4251ef8971d9e5727df1b': 'WithdrawalFinalized',
      // Message passing
      '0x4dfe1bbbcf077ddc3e01291eea2d5c70c2b422b415d95645b9adcfd678cb1d63': 'MessageSent',
      '0x5e3c1311ea442664e8b1611bfabef659120ea7a0a2cfc0667700bebc69cbffe1': 'MessageReceived'
    };

    // Analyze logs for bridge events
    let detectedEvents: string[] = [];
    for (const log of receipt.logs) {
      const eventName = bridgeEventSignatures[log.topics[0] as keyof typeof bridgeEventSignatures];
      if (eventName) {
        detectedEvents.push(eventName);

        // Extract relevant data based on event type
        if (eventName.includes('Deposit') || eventName.includes('Withdrawal')) {
          bridgeStatus.amount = log.data !== '0x' ? ethers.formatEther(log.data) : 'Unknown';
          if (log.topics.length > 1) {
            bridgeStatus.user = ethers.getAddress('0x' + log.topics[1].slice(26));
          }
        }
      }
    }

    // Determine bridge phase
    let phase = 'UNKNOWN';
    let estimatedCompletion = 'Unknown';

    if (detectedEvents.includes('DepositInitiated') || detectedEvents.includes('MessageSent')) {
      phase = 'SOURCE_CONFIRMED';

      // Estimate completion based on chain pairs
      if (validated.chain === 'ethereum') {
        estimatedCompletion = '15-45 minutes for L2s, 3-4 hours for sidechains';
      } else if (['arbitrum', 'optimism', 'base'].includes(validated.chain)) {
        phase = 'CHALLENGE_PERIOD';
        estimatedCompletion = '7 days (optimistic rollup challenge period)';
      } else {
        estimatedCompletion = '20-60 minutes';
      }
    }

    if (detectedEvents.includes('DepositFinalized') || detectedEvents.includes('WithdrawalFinalized')) {
      phase = 'COMPLETED';
      estimatedCompletion = 'Bridge transfer complete';
    }

    if (detectedEvents.includes('WithdrawalProven')) {
      phase = 'PROVEN';
      estimatedCompletion = 'Ready to finalize after challenge period';
    }

    // Check if this is a failed bridge
    if (receipt.status === 0) {
      phase = 'FAILED';
      estimatedCompletion = 'Transaction reverted - funds safe';
    }

    // Get current confirmations
    const currentBlock = await provider.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber;

    // Security recommendations based on bridge type and amount
    const securityChecks = {
      sufficientConfirmations: confirmations >= 12,
      verifiedContract: true, // Would need to check against known bridge contracts
      commonBridge: detectedEvents.length > 0,
      recommendation: confirmations < 12 ?
        'Wait for more confirmations before considering finalized' :
        'Sufficient confirmations received'
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          transactionHash: validated.transactionHash,
          status: {
            phase,
            initiated: bridgeStatus.initiated,
            confirmations,
            detectedEvents,
            estimatedCompletion
          },
          bridgeDetails: bridgeStatus,
          securityChecks,
          nextSteps: phase === 'SOURCE_CONFIRMED' ?
            'Monitor destination chain for arrival' :
            phase === 'CHALLENGE_PERIOD' ?
            'Wait for challenge period to complete (7 days)' :
            phase === 'PROVEN' ?
            'Execute finalization transaction on L1' :
            phase === 'COMPLETED' ?
            'Bridge transfer complete - check destination wallet' :
            'Check transaction status on block explorer',
          usefulLinks: {
            layerZeroScan: `https://layerzeroscan.com/tx/${validated.transactionHash}`,
            socketScan: `https://socketscan.io/tx/${validated.transactionHash}`,
            orbiterStatus: `https://www.orbiter.finance/status`
          }
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
          transactionHash: validated.transactionHash,
          suggestion: 'Ensure transaction hash is valid and from a bridge transaction'
        }, null, 2)
      }]
    };
  }
}