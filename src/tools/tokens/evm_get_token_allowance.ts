/**
 * Check how much a spender is approved to spend
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';
import { getErc20Contract } from '../../utils/erc20.js';
import { withValidatedAddress } from '../../utils/address-validator.js';
import { buildSuccessResponse, buildErrorResponse } from '../../utils/responses.js';

export async function handleGetTokenAllowance(args: {
  chain: string;
  tokenAddress: string;
  owner: string;
  spender: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    const config = clientManager.getChainConfig(args.chain);
    const provider = clientManager.getProvider(args.chain);
    const tokenAddress = withValidatedAddress(args.tokenAddress, 'tokenAddress');
    const ownerAddress = withValidatedAddress(args.owner, 'owner');
    const spenderAddress = withValidatedAddress(args.spender, 'spender');

    const contract = getErc20Contract(tokenAddress, provider);

    const [allowance, decimals, symbol] = await Promise.all([
      contract.allowance(ownerAddress, spenderAddress),
      contract.decimals(),
      contract.symbol()
    ]);

    const isUnlimited = allowance === ethers.MaxUint256;
    const formattedAllowance = isUnlimited ? 'unlimited' : ethers.formatUnits(allowance, decimals);

    return buildSuccessResponse({
      chain: args.chain,
      network: config.name,
      allowance: {
        token: {
          address: tokenAddress,
          symbol
        },
        owner: ownerAddress,
        spender: spenderAddress,
        amount: {
          raw: allowance.toString(),
          formatted: formattedAllowance,
          display: isUnlimited ? 'unlimited' : `${formattedAllowance} ${symbol}`,
          isUnlimited,
          hasAllowance: allowance > 0n
        }
      },
      actions: {
        toIncrease: 'Use evm_approve_token with higher amount',
        toRevoke: 'Use evm_approve_token with amount "0"'
      },
      explorer: {
        token: clientManager.getExplorerUrl(args.chain, tokenAddress),
        owner: clientManager.getExplorerUrl(args.chain, ownerAddress),
        spender: clientManager.getExplorerUrl(args.chain, spenderAddress)
      },
      executionTime: `${Date.now() - startTime}ms`
    });
  } catch (error: any) {
    return buildErrorResponse({
      error: error.message,
      chain: args.chain,
      tokenAddress: args.tokenAddress,
      owner: args.owner,
      spender: args.spender,
      timestamp: new Date().toISOString(),
      executionTime: `${Date.now() - startTime}ms`
    });
  }
}
