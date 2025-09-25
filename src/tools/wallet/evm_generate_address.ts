/**
 * Generate address from mnemonic with custom derivation path
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

export async function handleGenerateAddress(args: {
  chain: string;
  mnemonic: string;
  index?: number;
  account?: number;
  change?: number;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    // Validate chain
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    const config = clientManager.getChainConfig(args.chain);

    // Build BIP44 path: m/44'/60'/account'/change/index
    // 60 is the coin type for Ethereum (works for all EVM chains)
    const account = args.account ?? 0;
    const change = args.change ?? 0;
    const index = args.index ?? 0;
    const derivationPath = `m/44'/60'/${account}'/${change}/${index}`;

    // Generate wallet from mnemonic and path
    // Must use fromPhrase with path parameter, not derivePath on existing node
    const wallet = ethers.HDNodeWallet.fromPhrase(args.mnemonic, derivationPath);

    // Get provider to check if address has been used
    const provider = clientManager.getProvider(args.chain);
    const [balance, nonce, code] = await Promise.all([
      provider.getBalance(wallet.address),
      provider.getTransactionCount(wallet.address),
      provider.getCode(wallet.address)
    ]);

    const hasBalance = balance > 0n;
    const hasTransactions = nonce > 0;
    const isContract = code !== '0x';

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      derivation: {
        path: derivationPath,
        parameters: {
          account,
          change,
          index
        },
        standard: 'BIP44',
        coinType: 60,
        description: 'Ethereum standard derivation path'
      },
      address: {
        address: wallet.address,
        publicKey: wallet.signingKey.publicKey,
        isUsed: hasBalance || hasTransactions,
        hasBalance,
        hasTransactions,
        isContract,
        balance: hasBalance ? {
          wei: balance.toString(),
          ether: ethers.formatEther(balance),
          formatted: `${ethers.formatEther(balance)} ${config.nativeToken}`
        } : null,
        transactionCount: nonce
      },
      usage: {
        note: 'To derive multiple addresses from same mnemonic:',
        examples: [
          'index: 0, 1, 2... for multiple addresses in same account',
          'account: 0, 1, 2... for separate accounts (like different users)',
          'change: 0 for external, 1 for internal (change addresses)'
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
        'invalid mnemonic': 'Mnemonic must be 12 or 24 words separated by spaces',
        'invalid index': 'Index must be a non-negative integer',
        'BIP44 standard': 'Path format is m/44\'/60\'/account\'/change/index'
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
