/**
 * Get comprehensive token holdings summary including native balance, ERC-20 tokens, and portfolio diversity metrics
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function totalSupply() view returns (uint256)'
];

export async function handleGetTokenHoldingsSummary(args: {
  chain: string;
  address: string;
  tokenAddresses?: string[];
  includeZeroBalances?: boolean;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    const provider = clientManager.getProvider(args.chain);
    const includeZero = args.includeZeroBalances || false;

    // Get native token balance
    const nativeBalance = await provider.getBalance(args.address);

    const holdings: any = {
      native: {
        type: 'Native',
        symbol: 'ETH', // Chain-specific symbol would be better
        balance: ethers.formatEther(nativeBalance),
        balanceWei: nativeBalance.toString(),
        hasBalance: nativeBalance > 0n
      },
      tokens: []
    };

    let successfulTokenQueries = 0;
    let failedTokenQueries = 0;
    let totalTokensWithBalance = 0;
    let totalTokensChecked = 0;

    // Get ERC-20 token balances if provided
    if (args.tokenAddresses && args.tokenAddresses.length > 0) {
      for (const tokenAddress of args.tokenAddresses) {
        totalTokensChecked++;
        try {
          const tokenContract = new ethers.Contract(
            tokenAddress,
            ERC20_ABI,
            provider
          );

          const [balance, decimals, symbol, name, totalSupply] = await Promise.all([
            tokenContract.balanceOf(args.address),
            tokenContract.decimals(),
            tokenContract.symbol(),
            tokenContract.name(),
            tokenContract.totalSupply().catch(() => 0n) // Some tokens may not have totalSupply
          ]);

          const hasBalance = balance > 0n;

          if (hasBalance || includeZero) {
            const formattedBalance = ethers.formatUnits(balance, decimals);
            const percentOfSupply = totalSupply > 0n
              ? Number((balance * 10000n / totalSupply)) / 100
              : 0;

            holdings.tokens.push({
              type: 'ERC-20',
              address: tokenAddress,
              name,
              symbol,
              decimals,
              balance: formattedBalance,
              balanceRaw: balance.toString(),
              hasBalance,
              totalSupply: totalSupply.toString(),
              percentOfSupply: percentOfSupply > 0 ? percentOfSupply.toFixed(4) + '%' : '0%'
            });

            if (hasBalance) {
              totalTokensWithBalance++;
            }
          }

          successfulTokenQueries++;
        } catch (error: any) {
          failedTokenQueries++;
          if (includeZero) {
            holdings.tokens.push({
              type: 'ERC-20',
              address: tokenAddress,
              error: `Failed to fetch token data: ${error.message}`,
              hasBalance: false
            });
          }
        }
      }
    }

    // Calculate portfolio metrics
    const portfolioMetrics = {
      totalAssets: (nativeBalance > 0n ? 1 : 0) + totalTokensWithBalance,
      nativeTokenCount: nativeBalance > 0n ? 1 : 0,
      erc20TokenCount: totalTokensWithBalance,
      diversityScore: calculateDiversityScore(totalTokensWithBalance, nativeBalance > 0n),
      queriedTokens: totalTokensChecked,
      successfulQueries: successfulTokenQueries,
      failedQueries: failedTokenQueries,
      querySuccessRate: totalTokensChecked > 0
        ? `${((successfulTokenQueries / totalTokensChecked) * 100).toFixed(1)}%`
        : 'N/A'
    };

    // Identify top holdings by balance (simplified - would need price oracle for USD value)
    const tokensWithBalance = holdings.tokens.filter((t: any) => t.hasBalance && !t.error);
    const topHoldings = tokensWithBalance.slice(0, 5).map((t: any) => ({
      symbol: t.symbol,
      balance: t.balance,
      percentOfSupply: t.percentOfSupply
    }));

    // Asset allocation (simplified without USD values)
    const assetAllocation = {
      native: {
        symbol: holdings.native.symbol,
        balance: holdings.native.balance,
        percentage: 'Requires price oracle for accurate allocation'
      },
      tokens: tokensWithBalance.map((t: any) => ({
        symbol: t.symbol,
        balance: t.balance,
        percentage: 'Requires price oracle for accurate allocation'
      }))
    };

    // Portfolio health indicators
    const healthIndicators = {
      hasNativeBalance: nativeBalance > 0n,
      canPayGas: nativeBalance > ethers.parseEther('0.001'), // Rough estimate
      tokenDiversity: portfolioMetrics.diversityScore,
      riskLevel: totalTokensWithBalance > 10 ? 'Diversified' :
                 totalTokensWithBalance > 3 ? 'Moderate' :
                 totalTokensWithBalance > 0 ? 'Concentrated' : 'Single Asset'
    };

    const response = {
      success: true,
      chain: args.chain,
      address: args.address,
      holdings,
      portfolioMetrics,
      topHoldings: {
        count: topHoldings.length,
        items: topHoldings,
        note: 'Top 5 holdings by token count (requires price oracle for value-based ranking)'
      },
      assetAllocation,
      healthIndicators,
      recommendations: generateRecommendations(nativeBalance, totalTokensWithBalance, portfolioMetrics.diversityScore),
      metadata: {
        analysisDate: new Date().toISOString(),
        includeZeroBalances: includeZero,
        limitations: [
          'USD values require price oracle integration',
          'Asset allocation percentages require market data',
          'Top holdings ranked by token count, not USD value',
          'Diversity score is simplified without market cap weighting'
        ]
      },
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
      address: args.address,
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

/**
 * Calculate portfolio diversity score (0-100)
 */
function calculateDiversityScore(tokenCount: number, hasNative: boolean): number {
  const baseScore = hasNative ? 20 : 0;
  const tokenScore = Math.min(80, tokenCount * 10);
  return Math.min(100, baseScore + tokenScore);
}

/**
 * Generate portfolio recommendations based on holdings
 */
function generateRecommendations(
  nativeBalance: bigint,
  tokenCount: number,
  diversityScore: number
): string[] {
  const recommendations: string[] = [];

  if (nativeBalance === 0n) {
    recommendations.push('Fund account with native tokens to enable transactions and gas payments');
  } else if (nativeBalance < ethers.parseEther('0.01')) {
    recommendations.push('Consider increasing native token balance for transaction fees');
  }

  if (tokenCount === 0) {
    recommendations.push('Portfolio consists only of native tokens - consider diversifying with quality tokens');
  } else if (tokenCount > 20) {
    recommendations.push('Large number of token holdings - consider consolidating to reduce complexity');
  }

  if (diversityScore < 30) {
    recommendations.push('Low portfolio diversity - consider spreading holdings across multiple assets');
  } else if (diversityScore >= 70) {
    recommendations.push('Well-diversified portfolio across multiple assets');
  }

  if (recommendations.length === 0) {
    recommendations.push('Portfolio appears balanced - continue monitoring holdings and market conditions');
  }

  return recommendations;
}
