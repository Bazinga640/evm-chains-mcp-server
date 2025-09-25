/**
 * Create a new wallet with mnemonic phrase
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

export async function handleCreateWallet(args: {
  chain: string;
  includeSecrets?: boolean;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    // Validate chain
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    const config = clientManager.getChainConfig(args.chain);

    // Create new wallet
    const wallet = ethers.Wallet.createRandom();

    // Get the mnemonic
    const mnemonic = wallet.mnemonic;
    if (!mnemonic) {
      throw new Error('Failed to generate mnemonic');
    }

    // Build wallet object conditionally
    const walletInfo: any = {
      address: wallet.address,
      publicKey: wallet.signingKey.publicKey
    };

    // Only include secrets if explicitly requested
    if (args.includeSecrets === true) {
      walletInfo.mnemonic = {
        phrase: mnemonic.phrase,
        wordCount: mnemonic.phrase.split(' ').length
      };
      walletInfo.privateKey = wallet.privateKey;
    } else {
      walletInfo.secretsRedacted = true;
      walletInfo.note = 'Use includeSecrets: true to show mnemonic and private key (NOT RECOMMENDED - store offline instead)';
    }

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      wallet: walletInfo,
      security: {
        warning: '⚠️ CRITICAL SECURITY WARNING',
        instructions: [
          'NEVER share your mnemonic phrase or private key with anyone',
          'Store your mnemonic phrase offline in a secure location',
          'Anyone with your mnemonic can access ALL funds',
          'Consider using a hardware wallet for production funds',
          'This is a TESTNET wallet - do not use on mainnet without proper security'
        ]
      },
      nextSteps: [
        `Fund this wallet using a faucet for ${config.name}`,
        'Use evm_get_balance to check balance',
        'Use evm_get_account_info to verify wallet setup'
      ],
      explorer: clientManager.getExplorerUrl(args.chain, wallet.address),
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
