import { ethers } from 'ethers';
import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

// Supported bridges and their routes
const BRIDGE_ROUTES: Record<string, {
  chains: string[],
  tokens: string[],
  speed: 'instant' | 'fast' | 'standard' | 'slow',
  security: 'canonical' | 'optimistic' | 'third-party',
  liquidity: 'high' | 'medium' | 'low'
}> = {
  // Canonical bridges (most secure but slower)
  'ethereum-polygon-canonical': {
    chains: ['ethereum', 'polygon'],
    tokens: ['ETH', 'USDC', 'USDT', 'DAI', 'WETH', 'POL'],
    speed: 'standard',
    security: 'canonical',
    liquidity: 'high'
  },
  'ethereum-arbitrum-canonical': {
    chains: ['ethereum', 'arbitrum'],
    tokens: ['ETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'LINK'],
    speed: 'standard',
    security: 'canonical',
    liquidity: 'high'
  },
  'ethereum-optimism-canonical': {
    chains: ['ethereum', 'optimism'],
    tokens: ['ETH', 'USDC', 'DAI', 'WBTC', 'SNX', 'LINK'],
    speed: 'slow',
    security: 'canonical',
    liquidity: 'high'
  },
  'ethereum-base-canonical': {
    chains: ['ethereum', 'base'],
    tokens: ['ETH', 'USDC', 'DAI'],
    speed: 'standard',
    security: 'canonical',
    liquidity: 'medium'
  },

  // Fast bridges (third-party, faster but require trust)
  'hop-protocol': {
    chains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'],
    tokens: ['ETH', 'USDC', 'USDT', 'DAI', 'POL'],
    speed: 'fast',
    security: 'third-party',
    liquidity: 'high'
  },
  'stargate-finance': {
    chains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'bsc'],
    tokens: ['USDC', 'USDT', 'ETH', 'FRAX', 'DAI'],
    speed: 'instant',
    security: 'third-party',
    liquidity: 'high'
  },
  'across-protocol': {
    chains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'],
    tokens: ['ETH', 'USDC', 'WBTC', 'DAI', 'USDT'],
    speed: 'fast',
    security: 'third-party',
    liquidity: 'medium'
  },
  'synapse-bridge': {
    chains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'bsc', 'base'],
    tokens: ['ETH', 'USDC', 'USDT', 'DAI', 'SYN'],
    speed: 'fast',
    security: 'third-party',
    liquidity: 'high'
  },
  'celer-cbridge': {
    chains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'bsc'],
    tokens: ['ETH', 'USDC', 'USDT', 'WBTC', 'BUSD', 'CELR'],
    speed: 'fast',
    security: 'third-party',
    liquidity: 'medium'
  },

  // Specialized routes
  'avalanche-bridge': {
    chains: ['ethereum', 'avalanche'],
    tokens: ['AVAX', 'WETH', 'USDC', 'USDT', 'WBTC'],
    speed: 'standard',
    security: 'canonical',
    liquidity: 'high'
  },
  'binance-bridge': {
    chains: ['ethereum', 'bsc'],
    tokens: ['BNB', 'ETH', 'USDC', 'USDT', 'BUSD'],
    speed: 'standard',
    security: 'canonical',
    liquidity: 'high'
  }
};

const inputSchema = z.object({
  sourceChain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'optimism', 'worldchain']),
  targetChain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'optimism', 'worldchain']),
  token: z.string().describe('Token symbol or address'),
  amount: z.string().optional().describe('Amount for liquidity checking'),
  preferences: z.object({
    speed: z.enum(['instant', 'fast', 'standard', 'any']).optional().default('any'),
    security: z.enum(['canonical', 'any']).optional().default('any'),
    maxHops: z.number().optional().default(2)
  }).optional()
});

interface Route {
  path: string[];
  bridges: string[];
  estimatedTime: string;
  estimatedFees: string;
  security: string;
  liquidity: string;
  steps: string[];
  warnings?: string[];
}

export async function handleFindBridgeRoutes(args: z.infer<typeof inputSchema>) {
  const validated = inputSchema.parse(args);
  const preferences = validated.preferences || { speed: 'any', security: 'any', maxHops: 2 };

  try {
    const routes: Route[] = [];

    // Find direct routes
    for (const [bridgeName, bridgeInfo] of Object.entries(BRIDGE_ROUTES)) {
      const supportsRoute =
        bridgeInfo.chains.includes(validated.sourceChain) &&
        bridgeInfo.chains.includes(validated.targetChain);

      if (!supportsRoute) continue;

      // Check token support (simplified - would check actual contracts in production)
      const tokenSymbol = validated.token.length === 42 ? 'UNKNOWN' : validated.token.toUpperCase();
      const supportsToken = bridgeInfo.tokens.includes(tokenSymbol) ||
                           bridgeInfo.tokens.includes('ETH'); // ETH as fallback

      if (!supportsToken && tokenSymbol !== 'UNKNOWN') continue;

      // Check preferences
      if (preferences.speed !== 'any' && bridgeInfo.speed !== preferences.speed) continue;
      if (preferences.security !== 'any' && bridgeInfo.security !== preferences.security) continue;

      // Estimate time and fees
      const timeEstimates: Record<string, string> = {
        instant: '1-2 minutes',
        fast: '5-15 minutes',
        standard: '15-60 minutes',
        slow: '3-7 days'
      };

      const feeEstimates: Record<string, string> = {
        canonical: '0.1-0.3%',
        optimistic: '0.1-0.5%',
        'third-party': '0.05-0.25%'
      };

      routes.push({
        path: [validated.sourceChain, validated.targetChain],
        bridges: [bridgeName],
        estimatedTime: timeEstimates[bridgeInfo.speed],
        estimatedFees: feeEstimates[bridgeInfo.security],
        security: bridgeInfo.security,
        liquidity: bridgeInfo.liquidity,
        steps: [
          `1. Approve ${tokenSymbol} on ${validated.sourceChain}`,
          `2. Initiate bridge via ${bridgeName}`,
          `3. Wait for confirmations (${timeEstimates[bridgeInfo.speed]})`,
          `4. Receive ${tokenSymbol} on ${validated.targetChain}`
        ],
        warnings: bridgeInfo.security === 'third-party' ?
          ['Third-party bridge - ensure you trust the protocol'] : undefined
      });
    }

    // Find multi-hop routes if direct routes are limited
    if (routes.length < 3 && preferences.maxHops >= 2) {
      const hubChains = ['ethereum', 'polygon', 'arbitrum']; // Common hub chains

      for (const hub of hubChains) {
        if (hub === validated.sourceChain || hub === validated.targetChain) continue;

        // Find source -> hub bridge
        let sourceToHub: typeof BRIDGE_ROUTES[string] | null = null;
        let sourceToHubName = '';

        for (const [bridgeName, bridgeInfo] of Object.entries(BRIDGE_ROUTES)) {
          if (bridgeInfo.chains.includes(validated.sourceChain) &&
              bridgeInfo.chains.includes(hub)) {
            sourceToHub = bridgeInfo;
            sourceToHubName = bridgeName;
            break;
          }
        }

        // Find hub -> target bridge
        let hubToTarget: typeof BRIDGE_ROUTES[string] | null = null;
        let hubToTargetName = '';

        for (const [bridgeName, bridgeInfo] of Object.entries(BRIDGE_ROUTES)) {
          if (bridgeInfo.chains.includes(hub) &&
              bridgeInfo.chains.includes(validated.targetChain)) {
            hubToTarget = bridgeInfo;
            hubToTargetName = bridgeName;
            break;
          }
        }

        if (sourceToHub && hubToTarget) {
          const totalTime = sourceToHub.speed === 'instant' && hubToTarget.speed === 'instant' ? '5-10 minutes' :
                           sourceToHub.speed === 'fast' && hubToTarget.speed === 'fast' ? '15-30 minutes' :
                           '30-90 minutes';

          routes.push({
            path: [validated.sourceChain, hub, validated.targetChain],
            bridges: [sourceToHubName, hubToTargetName],
            estimatedTime: totalTime,
            estimatedFees: '0.2-0.6%', // Higher for multi-hop
            security: sourceToHub.security === 'canonical' && hubToTarget.security === 'canonical' ?
                     'canonical' : 'mixed',
            liquidity: 'medium',
            steps: [
              `1. Bridge ${validated.sourceChain} → ${hub} via ${sourceToHubName}`,
              `2. Wait for arrival on ${hub}`,
              `3. Bridge ${hub} → ${validated.targetChain} via ${hubToTargetName}`,
              `4. Receive tokens on ${validated.targetChain}`
            ],
            warnings: ['Multi-hop route - higher fees and longer time']
          });
        }
      }
    }

    // Sort routes by preference
    routes.sort((a, b) => {
      // Prioritize direct routes
      if (a.path.length !== b.path.length) {
        return a.path.length - b.path.length;
      }
      // Then by security
      if (a.security === 'canonical' && b.security !== 'canonical') return -1;
      if (b.security === 'canonical' && a.security !== 'canonical') return 1;
      // Then by speed
      const speedOrder = { instant: 0, fast: 1, standard: 2, slow: 3 };
      const aSpeed = a.estimatedTime.includes('minute') ? 1 : 3;
      const bSpeed = b.estimatedTime.includes('minute') ? 1 : 3;
      return aSpeed - bSpeed;
    });

    // Add risk assessment
    const riskAssessment = {
      highRisk: routes.filter(r => r.security === 'third-party' && r.path.length > 2),
      mediumRisk: routes.filter(r => r.security === 'third-party' || r.path.length > 2),
      lowRisk: routes.filter(r => r.security === 'canonical' && r.path.length === 2)
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          source: validated.sourceChain,
          target: validated.targetChain,
          token: validated.token,
          routesFound: routes.length,
          recommendedRoute: routes[0] || null,
          allRoutes: routes,
          riskAssessment: {
            safestRoute: riskAssessment.lowRisk[0] || routes[0],
            fastestRoute: routes.find(r => r.estimatedTime.includes('1-2 minutes')) || routes[0],
            cheapestRoute: routes.find(r => r.estimatedFees.includes('0.05')) || routes[0]
          },
          alternativeOptions: routes.length === 0 ? [
            'Consider swapping to a bridgeable token first',
            'Use a DEX aggregator with cross-chain support',
            'Break into multiple smaller bridges',
            'Wait for new bridge deployments'
          ] : null,
          securityTips: [
            'Always verify bridge contract addresses',
            'Start with small test amounts',
            'Check bridge liquidity before large transfers',
            'Monitor gas prices on both chains',
            'Have enough native tokens for fees on destination'
          ]
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
          suggestion: 'Check chain pair is valid and token is specified correctly'
        }, null, 2)
      }]
    };
  }
}