/**
 * Get wallet information without exposing private keys
 * Useful for checking wallet details from an address
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

export async function handleGetWalletInfo(args: {
  chain: string;
  address: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    // Validate chain
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    // Validate address
    if (!clientManager.isValidAddress(args.address)) {
      throw new Error(`Invalid address: ${args.address}`);
    }

    const config = clientManager.getChainConfig(args.chain);
    const checksumAddress = clientManager.getChecksumAddress(args.address);
    const provider = clientManager.getProvider(args.chain);

    // Get wallet information
    const [balance, nonce, code] = await Promise.all([
      provider.getBalance(checksumAddress),
      provider.getTransactionCount(checksumAddress),
      provider.getCode(checksumAddress)
    ]);

    const isContract = code !== '0x';
    const hasBalance = balance > 0n;
    const hasTransactions = nonce > 0;

    // Determine wallet status
    let status: string;
    if (isContract) {
      status = 'smart_contract';
    } else if (!hasBalance && !hasTransactions) {
      status = 'unused';
    } else if (hasBalance && hasTransactions) {
      status = 'active';
    } else if (hasTransactions) {
      status = 'empty_but_used';
    } else {
      status = 'funded_but_unused';
    }

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      wallet: {
        address: checksumAddress,
        type: isContract ? 'Smart Contract' : 'Externally Owned Account (EOA)',
        status,
        balance: {
          wei: balance.toString(),
          ether: ethers.formatEther(balance),
          formatted: `${ethers.formatEther(balance)} ${config.nativeToken}`,
          hasBalance
        },
        activity: {
          transactionCount: nonce,
          hasTransactions,
          nextNonce: nonce
        }
      },
      statusExplanation: {
        unused: 'Address has never been used',
        active: 'Address has balance and transaction history',
        empty_but_used: 'Address previously used but now empty',
        funded_but_unused: 'Address has balance but no outgoing transactions',
        smart_contract: 'Address is a deployed smart contract'
      }[status],
      capabilities: isContract ? {
        note: 'Smart contracts cannot sign transactions',
        canReceive: true,
        canSend: false,
        hasCode: true,
        codeSize: `${(code.length - 2) / 2} bytes`
      } : {
        note: 'EOA can send and receive transactions',
        canReceive: true,
        canSend: true,
        hasCode: false,
        requiresPrivateKey: 'Must have private key to send transactions'
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
