/**
 * Get comprehensive account information for any EVM chain
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

export async function handleGetAccountInfo(args: {
  chain: string;
  address: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    // Validate inputs
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    if (!clientManager.isValidAddress(args.address)) {
      throw new Error(`Invalid address: ${args.address}`);
    }

    // Get provider and config
    const provider = clientManager.getProvider(args.chain);
    const config = clientManager.getChainConfig(args.chain);
    const checksumAddress = clientManager.getChecksumAddress(args.address);

    // Get account information in parallel
    const [balance, nonce, code] = await Promise.all([
      provider.getBalance(checksumAddress),
      provider.getTransactionCount(checksumAddress),
      provider.getCode(checksumAddress)
    ]);

    const isContract = code !== '0x';
    const hasBalance = balance > 0n;
    const hasTransactions = nonce > 0;

    const response = {
      success: true,
      chain: args.chain,
      chainId: config.chainId,
      network: config.name,
      account: {
        address: checksumAddress,
        type: isContract ? 'contract' : 'externally owned account (EOA)',
        isContract,
        balance: {
          wei: balance.toString(),
          ether: ethers.formatEther(balance),
          formatted: `${ethers.formatEther(balance)} ${config.nativeToken}`
        },
        nonce,
        transactionCount: nonce,
        hasBalance,
        hasTransactions,
        contractCode: isContract ? {
          size: (code.length - 2) / 2, // Subtract '0x' and divide by 2 for bytes
          codeHash: ethers.keccak256(code),
          codePreview: code.slice(0, 66) + '...' // First 32 bytes
        } : null
      },
      explorer: clientManager.getExplorerUrl(args.chain, checksumAddress),
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
