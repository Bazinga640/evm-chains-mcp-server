/**
 * Mint additional tokens (requires minter role/permissions)
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';
import { getErc20Contract } from '../../utils/erc20.js';
import { withValidatedAddress } from '../../utils/address-validator.js';
import { buildSuccessResponse, buildErrorResponse } from '../../utils/responses.js';

export async function handleMintToken(args: {
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

    const config = clientManager.getChainConfig(args.chain);
    const provider = clientManager.getProvider(args.chain);

    const wallet = new ethers.Wallet(args.privateKey, provider);
    const contract = getErc20Contract(args.tokenAddress, wallet, [
      'function mint(address to, uint256 amount) returns (bool)',
      'function totalSupply() view returns (uint256)'
    ]);
    const tokenAddress = contract.target as string;
    const toAddress = withValidatedAddress(args.toAddress, 'toAddress');

    // Get token info
    const [decimals, symbol, totalSupplyBefore] = await Promise.all([
      contract.decimals(),
      contract.symbol(),
      contract.totalSupply()
    ]);

    const amountBigInt = ethers.parseUnits(args.amount, decimals);

    // Execute mint
    const tx = await contract.mint(toAddress, amountBigInt);

    return buildSuccessResponse({
      chain: args.chain,
      network: config.name,
      minting: {
        token: {
          address: tokenAddress,
          symbol
        },
        recipient: toAddress,
        amount: {
          raw: amountBigInt.toString(),
          formatted: args.amount,
          display: `${args.amount} ${symbol}`
        },
        totalSupply: {
          before: ethers.formatUnits(totalSupplyBefore, decimals),
          after: ethers.formatUnits(totalSupplyBefore + amountBigInt, decimals)
        }
      },
      transaction: {
        hash: tx.hash,
        status: 'pending',
        minter: wallet.address
      },
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
        'execution reverted': 'Caller may not have minter role or token does not support minting',
        'function selector was not recognized': 'Token contract does not implement mint() function'
      }
    });
  }
}
