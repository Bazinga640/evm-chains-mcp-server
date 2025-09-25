/**
 * Get total portfolio value including native tokens and ERC-20 holdings
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

export async function handleGetPortfolioValue(args: {
  chain: string;
  address: string;
  tokenAddresses?: string[];
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    const provider = clientManager.getProvider(args.chain);

    // Get native token balance
    const nativeBalance = await provider.getBalance(args.address);

    const portfolio: any = {
      native: {
        symbol: 'ETH', // Chain-specific symbol would be better
        balance: ethers.formatEther(nativeBalance),
        balanceWei: nativeBalance.toString(),
        usdValue: null // Would need price oracle
      },
      tokens: []
    };

    // Get ERC-20 token balances if provided
    if (args.tokenAddresses && args.tokenAddresses.length > 0) {
      for (const tokenAddress of args.tokenAddresses) {
        try {
          const tokenContract = new ethers.Contract(
            tokenAddress,
            ERC20_ABI,
            provider
          );

          const [balance, decimals, symbol, name] = await Promise.all([
            tokenContract.balanceOf(args.address),
            tokenContract.decimals(),
            tokenContract.symbol(),
            tokenContract.name()
          ]);

          if (balance > 0n) {
            portfolio.tokens.push({
              address: tokenAddress,
              name,
              symbol,
              decimals,
              balance: ethers.formatUnits(balance, decimals),
              balanceRaw: balance.toString(),
              usdValue: null // Would need price oracle
            });
          }
        } catch (error: any) {
          portfolio.tokens.push({
            address: tokenAddress,
            error: `Failed to fetch token data: ${error.message}`
          });
        }
      }
    }

    const response = {
      success: true,
      chain: args.chain,
      address: args.address,
      portfolio,
      summary: {
        nativeTokenCount: 1,
        erc20TokenCount: portfolio.tokens.filter((t: any) => !t.error).length,
        totalAssets: 1 + portfolio.tokens.filter((t: any) => !t.error).length,
        failedTokens: portfolio.tokens.filter((t: any) => t.error).length,
        note: 'USD values require price oracle integration'
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
