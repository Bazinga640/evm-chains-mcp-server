/**
 * Approve spender to use tokens (for DEX/DeFi interactions)
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';
import { getErc20Contract } from '../../utils/erc20.js';
import { withValidatedAddress } from '../../utils/address-validator.js';
import { buildSuccessResponse, buildErrorResponse } from '../../utils/responses.js';

export async function handleApproveToken(args: {
  chain: string;
  tokenAddress: string;
  spender: string;
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

    const spenderAddress = withValidatedAddress(args.spender, 'spender');

    const contract = getErc20Contract(args.tokenAddress, wallet);
    const tokenAddress = contract.target as string;

    const [decimals, symbol, currentAllowance] = await Promise.all([
      contract.decimals(),
      contract.symbol(),
      contract.allowance(wallet.address, spenderAddress)
    ]);

    const amountWei = args.amount === 'unlimited'
      ? ethers.MaxUint256
      : ethers.parseUnits(args.amount, decimals);

    const tx = await contract.approve(spenderAddress, amountWei);
    const receipt = await tx.wait();

    const newAllowance = await contract.allowance(wallet.address, spenderAddress);

    return buildSuccessResponse({
      chain: args.chain,
      network: config.name,
      approval: {
        token: {
          address: tokenAddress,
          symbol
        },
        owner: wallet.address,
        spender: spenderAddress,
        amount: {
          raw: amountWei.toString(),
          formatted: args.amount === 'unlimited' ? 'unlimited' : args.amount,
          isUnlimited: args.amount === 'unlimited'
        },
        previousAllowance: ethers.formatUnits(currentAllowance, decimals),
        newAllowance: newAllowance === ethers.MaxUint256
          ? 'unlimited'
          : ethers.formatUnits(newAllowance, decimals)
      },
      transaction: {
        hash: tx.hash,
        status: receipt?.status === 1 ? 'success' : 'failed',
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed.toString()
      },
      security: {
        warning: '⚠️ APPROVAL GRANTED',
        notes: [
          'Spender can now transfer tokens on your behalf',
          'Unlimited approvals persist until revoked',
          'To revoke: set amount to "0"',
          'Consider approving only what you need'
        ]
      },
      explorer: clientManager.getTransactionExplorerUrl(args.chain, tx.hash),
      executionTime: `${Date.now() - startTime}ms`
    });
  } catch (error: any) {
    return buildErrorResponse({
      error: error.message,
      chain: args.chain,
      tokenAddress: args.tokenAddress,
      spender: args.spender,
      amount: args.amount,
      timestamp: new Date().toISOString(),
      executionTime: `${Date.now() - startTime}ms`
    });
  }
}
