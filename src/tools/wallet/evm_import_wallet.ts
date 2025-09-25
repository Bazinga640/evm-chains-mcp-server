/**
 * Import wallet from private key or mnemonic
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

export async function handleImportWallet(args: {
  chain: string;
  privateKey?: string;
  mnemonic?: string;
  derivationPath?: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    // Validate chain
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    // Require either privateKey or mnemonic
    if (!args.privateKey && !args.mnemonic) {
      throw new Error('Must provide either privateKey or mnemonic');
    }

    if (args.privateKey && args.mnemonic) {
      throw new Error('Provide only one: privateKey OR mnemonic, not both');
    }

    const config = clientManager.getChainConfig(args.chain);
    let wallet: ethers.HDNodeWallet | ethers.Wallet;
    let importMethod: string;
    let mnemonicInfo = null;

    // Import from private key
    if (args.privateKey) {
      wallet = new ethers.Wallet(args.privateKey);
      importMethod = 'private_key';
    }
    // Import from mnemonic
    else if (args.mnemonic) {
      const path = args.derivationPath || "m/44'/60'/0'/0/0";
      const hdNode = ethers.HDNodeWallet.fromPhrase(args.mnemonic);
      wallet = hdNode.derivePath(path);
      importMethod = 'mnemonic';

      // DO NOT echo back the mnemonic - only store derivation path
      mnemonicInfo = {
        path: path,
        wordCount: args.mnemonic.split(' ').length,
        note: 'Mnemonic phrase NOT returned for security (store offline securely)'
      };
    } else {
      throw new Error('Unexpected import error');
    }

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      importMethod,
      wallet: {
        address: wallet.address,
        publicKey: wallet.signingKey.publicKey,
        ...(mnemonicInfo && { derivationInfo: mnemonicInfo })
      },
      security: {
        warning: '⚠️ SECURITY NOTICE',
        notes: [
          'Wallet imported successfully',
          'Private key is NOT stored by this server',
          'You must securely store your credentials',
          'Use evm_get_account_info to verify the import'
        ]
      },
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
      executionTime: `${Date.now() - startTime}ms`,
      troubleshooting: {
        'invalid private key': 'Private key must be 64 hex characters (with or without 0x prefix)',
        'invalid mnemonic': 'Mnemonic must be 12 or 24 words separated by spaces',
        'invalid derivation path': 'Path must follow BIP44 format (e.g., m/44\'/60\'/0\'/0/0)'
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
