/**
 * Send a signed transaction to any EVM chain
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

export async function handleSendTransaction(args: {
  chain: string;
  signedTransaction: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    // Validate inputs
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    if (!args.signedTransaction || !args.signedTransaction.startsWith('0x')) {
      throw new Error('Invalid signed transaction format - must start with 0x');
    }

    // Get provider and config
    const provider = clientManager.getProvider(args.chain);
    const config = clientManager.getChainConfig(args.chain);

    // Parse the transaction to get details before sending
    const parsedTx = ethers.Transaction.from(args.signedTransaction);

    // Send the transaction
    const tx = await provider.broadcastTransaction(args.signedTransaction);

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      transaction: {
        hash: tx.hash,
        from: tx.from,
        to: tx.to || null,
        value: {
          wei: tx.value.toString(),
          ether: ethers.formatEther(tx.value),
          formatted: `${ethers.formatEther(tx.value)} ${config.nativeToken}`
        },
        gasLimit: tx.gasLimit.toString(),
        nonce: tx.nonce,
        chainId: tx.chainId,
        type: tx.type,
        status: 'pending'
      },
      explorer: clientManager.getTransactionExplorerUrl(args.chain, tx.hash),
      note: 'Transaction broadcast successfully. Use evm_get_transaction to check status.',
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
      timestamp: new Date().toISOString(),
      executionTime: `${Date.now() - startTime}ms`,
      troubleshooting: {
        common_errors: {
          'insufficient funds': 'Account does not have enough balance to cover value + gas',
          'nonce too low': 'Transaction nonce already used - get current nonce with evm_get_account_info',
          'gas too low': 'Gas limit too low for transaction - use evm_estimate_gas',
          'invalid signature': 'Transaction not properly signed or signature invalid'
        }
      }
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(errorResponse, null, 2)
      }]
    };
  }
}
