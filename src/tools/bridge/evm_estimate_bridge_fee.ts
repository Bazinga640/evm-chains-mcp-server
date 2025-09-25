import { ethers } from 'ethers';
import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

// Bridge fee structures by protocol
const BRIDGE_FEES: Record<string, Record<string, { base: number, percentage: number }>> = {
  canonical: {
    'ethereum-polygon': { base: 0.001, percentage: 0.0 },
    'ethereum-arbitrum': { base: 0.002, percentage: 0.0 },
    'ethereum-optimism': { base: 0.002, percentage: 0.0 },
    'ethereum-base': { base: 0.001, percentage: 0.0 },
    'polygon-ethereum': { base: 0.01, percentage: 0.0 },
    'arbitrum-ethereum': { base: 0.005, percentage: 0.0 },
    'optimism-ethereum': { base: 0.005, percentage: 0.0 },
    'base-ethereum': { base: 0.003, percentage: 0.0 }
  },
  hop: {
    default: { base: 0.0, percentage: 0.25 } // 0.25% fee
  },
  stargate: {
    default: { base: 0.0, percentage: 0.06 } // 0.06% fee
  },
  across: {
    default: { base: 0.0, percentage: 0.12 } // 0.12% fee
  },
  synapse: {
    default: { base: 0.0, percentage: 0.05 } // 0.05% fee
  },
  celer: {
    default: { base: 0.0, percentage: 0.04 } // 0.04% fee
  }
};

const inputSchema = z.object({
  sourceChain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'optimism', 'worldchain']),
  targetChain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'optimism', 'worldchain']),
  token: z.string().describe('Token address to bridge'),
  amount: z.string().describe('Amount to bridge'),
  bridgeProtocol: z.enum(['canonical', 'hop', 'stargate', 'across', 'synapse', 'celer']).optional(),
  urgency: z.enum(['economy', 'standard', 'fast']).optional().default('standard')
});

export async function handleEstimateBridgeFee(args: z.infer<typeof inputSchema>) {
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const sourceProvider = clientManager.getProvider(validated.sourceChain);
    const targetProvider = clientManager.getProvider(validated.targetChain);

    const amountWei = ethers.parseEther(validated.amount);

    // Get current gas prices on both chains
    const [sourceFeeData, targetFeeData] = await Promise.all([
      sourceProvider.getFeeData(),
      targetProvider.getFeeData()
    ]);

    // Calculate base gas costs
    const sourceGasPrice = sourceFeeData.gasPrice || ethers.parseUnits('30', 'gwei');
    const targetGasPrice = targetFeeData.gasPrice || ethers.parseUnits('30', 'gwei');

    // Estimate gas units for bridge operations
    const gasEstimates = {
      deposit: 150000n, // Source chain deposit
      relay: 50000n,   // Relayer fee
      mint: 100000n,    // Destination chain mint/release
      finalize: 200000n // L2 to L1 finalization (if applicable)
    };

    // Calculate protocol-specific fees
    let protocolFee = 0n;
    let feePercentage = 0;
    const route = `${validated.sourceChain}-${validated.targetChain}`;

    if (validated.bridgeProtocol) {
      const feeStructure = BRIDGE_FEES[validated.bridgeProtocol]?.[route] ||
                          BRIDGE_FEES[validated.bridgeProtocol]?.default ||
                          { base: 0, percentage: 0.1 };

      const baseFee = ethers.parseEther(feeStructure.base.toString());
      const percentageFee = (amountWei * BigInt(Math.floor(feeStructure.percentage * 10000))) / 10000n;
      protocolFee = baseFee + percentageFee;
      feePercentage = feeStructure.percentage;
    }

    // Calculate urgency multiplier
    const urgencyMultiplier = validated.urgency === 'fast' ? 150n :
                              validated.urgency === 'economy' ? 80n : 100n;

    // Calculate total gas costs
    const sourceGasCost = (gasEstimates.deposit * sourceGasPrice * urgencyMultiplier) / 100n;
    const targetGasCost = (gasEstimates.mint * targetGasPrice) / 100n;
    const relayerFee = (gasEstimates.relay * targetGasPrice * 120n) / 100n; // 20% markup for relayers

    // Special handling for L2 -> L1
    let finalizationCost = 0n;
    if (['arbitrum', 'optimism', 'base'].includes(validated.sourceChain) &&
        validated.targetChain === 'ethereum') {
      finalizationCost = gasEstimates.finalize * sourceGasPrice;
    }

    // Calculate total fees
    const totalGasCost = sourceGasCost + targetGasCost + relayerFee + finalizationCost;
    const totalFee = totalGasCost + protocolFee;

    // Get native token prices for USD estimates (mock data - would use oracle in production)
    const nativePrices: Record<string, number> = {
      ethereum: 2500,
      polygon: 0.7,
      avalanche: 35,
      bsc: 300,
      arbitrum: 2500, // ETH
      optimism: 2500, // ETH
      base: 2500,     // ETH
      worldchain: 1
    };

    const sourceNativePrice = nativePrices[validated.sourceChain];
    const totalFeeUSD = Number(ethers.formatEther(totalFee)) * sourceNativePrice;

    // Compare different bridge options
    const alternatives: any[] = [];
    const protocols = ['canonical', 'hop', 'stargate', 'across', 'synapse', 'celer'];

    for (const protocol of protocols) {
      if (protocol === validated.bridgeProtocol) continue;

      const altFeeStructure = BRIDGE_FEES[protocol]?.[route] ||
                              BRIDGE_FEES[protocol]?.default ||
                              { base: 0, percentage: 0.1 };

      const altBaseFee = ethers.parseEther(altFeeStructure.base.toString());
      const altPercentageFee = (amountWei * BigInt(Math.floor(altFeeStructure.percentage * 10000))) / 10000n;
      const altProtocolFee = altBaseFee + altPercentageFee;
      const altTotalFee = totalGasCost + altProtocolFee;

      alternatives.push({
        protocol,
        totalFee: ethers.formatEther(altTotalFee),
        totalFeeUSD: Number(ethers.formatEther(altTotalFee)) * sourceNativePrice,
        protocolFee: altFeeStructure.percentage * 100 + '%',
        estimatedTime: protocol === 'canonical' ? '15-60 min' :
                      protocol === 'hop' ? '5-10 min' :
                      protocol === 'stargate' ? '1-5 min' :
                      protocol === 'across' ? '1-10 min' :
                      '5-30 min'
      });
    }

    // Sort alternatives by fee
    alternatives.sort((a, b) => a.totalFeeUSD - b.totalFeeUSD);

    // Security warnings
    const warnings: string[] = [];
    if (totalFeeUSD > Number(validated.amount) * sourceNativePrice * 0.01) {
      warnings.push('Fees exceed 1% of transfer amount');
    }
    if (validated.urgency === 'fast') {
      warnings.push('Fast mode may result in overpaying for gas');
    }
    if (!validated.bridgeProtocol) {
      warnings.push('Consider comparing multiple bridge protocols');
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          route: `${validated.sourceChain} → ${validated.targetChain}`,
          token: validated.token,
          amount: validated.amount,
          feeBreakdown: {
            sourceChainGas: ethers.formatEther(sourceGasCost),
            targetChainGas: ethers.formatEther(targetGasCost),
            relayerFee: ethers.formatEther(relayerFee),
            protocolFee: ethers.formatEther(protocolFee),
            finalizationCost: finalizationCost > 0n ? ethers.formatEther(finalizationCost) : null,
            totalFee: ethers.formatEther(totalFee),
            totalFeeUSD: `$${totalFeeUSD.toFixed(2)}`
          },
          feePercentage: `${((Number(ethers.formatEther(totalFee)) / Number(validated.amount)) * 100).toFixed(3)}%`,
          gasPrices: {
            source: ethers.formatUnits(sourceGasPrice, 'gwei') + ' gwei',
            target: ethers.formatUnits(targetGasPrice, 'gwei') + ' gwei'
          },
          urgencyMode: validated.urgency,
          alternativeBridges: alternatives.slice(0, 3), // Top 3 cheapest alternatives
          warnings,
          recommendations: [
            alternatives[0].totalFeeUSD < totalFeeUSD ?
              `Consider ${alternatives[0].protocol} for ${((1 - alternatives[0].totalFeeUSD/totalFeeUSD) * 100).toFixed(1)}% lower fees` :
              'Current selection is most economical',
            totalFeeUSD > 50 ? 'Consider batching multiple transfers to amortize fees' : null,
            validated.urgency === 'economy' ? null : 'Economy mode can save 20% on gas costs'
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
          suggestion: 'Check chain pair is supported and amount is valid'
        }, null, 2)
      }]
    };
  }
}