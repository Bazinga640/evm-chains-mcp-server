/**
 * Burn tokens (permanently remove from circulation)
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';
import { getErc20Contract } from '../../utils/erc20.js';
import { buildSuccessResponse, buildErrorResponse } from '../../utils/responses.js';

export async function handleBurnToken(args: {
  chain: string;
  tokenAddress: string;
  amount: string;
  privateKey: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    const config = clientManager.getChainConfig(args.chain);
    const provider = clientManager.getProvider(args.chain);

    const wallet = new ethers.Wallet(args.privateKey, provider);
    const contract = getErc20Contract(args.tokenAddress, wallet, [
      'function burn(uint256 amount) returns (bool)',
      'function totalSupply() view returns (uint256)'
    ]);
    const tokenAddress = contract.target as string;

    // Get token info
    const [decimals, symbol, balance, totalSupplyBefore] = await Promise.all([
      contract.decimals(),
      contract.symbol(),
      contract.balanceOf(wallet.address),
      contract.totalSupply()
    ]);

    const amountBigInt = ethers.parseUnits(args.amount, decimals);

    if (amountBigInt > balance) {
      throw new Error(`Insufficient balance: have ${ethers.formatUnits(balance, decimals)} ${symbol}, trying to burn ${args.amount}`);
    }

    // Execute burn
    const tx = await contract.burn(amountBigInt);

    return buildSuccessResponse({
      chain: args.chain,
      network: config.name,
      burning: {
        token: {
          address: tokenAddress,
          symbol
        },
        burner: wallet.address,
        amount: {
          raw: amountBigInt.toString(),
          formatted: args.amount,
          display: `${args.amount} ${symbol}`
        },
        totalSupply: {
          before: ethers.formatUnits(totalSupplyBefore, decimals),
          after: ethers.formatUnits(totalSupplyBefore - amountBigInt, decimals),
          burned: args.amount
        },
        remainingBalance: ethers.formatUnits(balance - amountBigInt, decimals)
      },
      transaction: {
        hash: tx.hash,
        status: 'pending'
      },
      note: 'Burned tokens are permanently removed from circulation',
      explorer: clientManager.getTransactionExplorerUrl(args.chain, tx.hash),
      executionTime: `${Date.now() - startTime}ms`
    });
  } catch (error: any) {
    return buildErrorResponse({
      error: error.message,
      chain: args.chain,
      timestamp: new Date().toISOString(),
      executionTime: `${Date.now() - startTime}ms`,
      troubleshooting: {
        'execution reverted': 'Token may not support burning or insufficient balance',
        'function selector was not recognized': 'Token contract does not implement burn() function'
      }
    });
  }
}
