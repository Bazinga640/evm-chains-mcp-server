/**
 * Transfer ERC20 tokens from one address to another
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';
import { getErc20Contract } from '../../utils/erc20.js';
import { buildSuccessResponse, buildErrorResponse } from '../../utils/responses.js';

export async function handleTransferToken(args: {
  chain: string;
  tokenAddress: string;
  toAddress: string;
  amount: string;
  privateKey: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    if (!clientManager.isValidAddress(args.tokenAddress)) {
      throw new Error(`Invalid token address: ${args.tokenAddress}`);
    }

    if (!clientManager.isValidAddress(args.toAddress)) {
      throw new Error(`Invalid recipient address: ${args.toAddress}`);
    }

    const config = clientManager.getChainConfig(args.chain);
    const provider = clientManager.getProvider(args.chain);
    const wallet = new ethers.Wallet(args.privateKey, provider);

    const toAddress = clientManager.getChecksumAddress(args.toAddress);

    const contract = getErc20Contract(args.tokenAddress, wallet);
    const tokenAddress = contract.target as string;

    // Get token info
    const [decimals, symbol, balance] = await Promise.all([
      contract.decimals(),
      contract.symbol(),
      contract.balanceOf(wallet.address)
    ]);

    // Parse amount with decimals
    const amountWei = ethers.parseUnits(args.amount, decimals);

    // Check balance
    if (balance < amountWei) {
      throw new Error(`Insufficient balance. Have ${ethers.formatUnits(balance, decimals)} ${symbol}, need ${args.amount} ${symbol}`);
    }

    // Execute transfer
    const tx = await contract.transfer(toAddress, amountWei);
    const receipt = await tx.wait();

    return buildSuccessResponse({
      chain: args.chain,
      network: config.name,
      transaction: {
        hash: tx.hash,
        from: wallet.address,
        to: toAddress,
        token: {
          address: tokenAddress,
          symbol,
          amount: {
            raw: amountWei.toString(),
            formatted: args.amount,
            display: `${args.amount} ${symbol}`
          }
        },
        status: receipt?.status === 1 ? 'success' : 'failed',
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed.toString()
      },
      explorer: clientManager.getTransactionExplorerUrl(args.chain, tx.hash),
      executionTime: `${Date.now() - startTime}ms`
    });
  } catch (error: any) {
    return buildErrorResponse({
      error: error.message,
      chain: args.chain,
      tokenAddress: args.tokenAddress,
      toAddress: args.toAddress,
      amount: args.amount,
      timestamp: new Date().toISOString(),
      executionTime: `${Date.now() - startTime}ms`
    });
  }
}
