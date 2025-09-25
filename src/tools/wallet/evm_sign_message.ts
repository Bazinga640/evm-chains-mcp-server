/**
 * Sign a message with a wallet (for authentication/verification)
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

export async function handleSignMessage(args: {
  chain: string;
  message: string;
  privateKey: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    // Validate chain
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    const config = clientManager.getChainConfig(args.chain);

    // Create wallet from private key
    const wallet = new ethers.Wallet(args.privateKey);

    // Sign the message
    const signature = await wallet.signMessage(args.message);

    // Parse signature components
    const sig = ethers.Signature.from(signature);

    // Verify the signature
    const recoveredAddress = ethers.verifyMessage(args.message, signature);
    const isValid = recoveredAddress.toLowerCase() === wallet.address.toLowerCase();

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      message: {
        original: args.message,
        length: args.message.length,
        hash: ethers.hashMessage(args.message)
      },
      signature: {
        full: signature,
        r: sig.r,
        s: sig.s,
        v: sig.v,
        format: 'Ethereum Signed Message'
      },
      signer: {
        address: wallet.address,
        verified: isValid,
        recoveredAddress
      },
      usage: {
        note: 'This signature can be used for:',
        purposes: [
          'Proving ownership of the address',
          'Authentication without revealing private key',
          'Message verification on-chain or off-chain',
          'Login to dApps (Sign-in with Ethereum)'
        ],
        verification: 'Use ethers.verifyMessage(message, signature) to verify'
      },
      security: {
        warning: '⚠️ SECURITY NOTES',
        guidelines: [
          'Never sign messages from untrusted sources',
          'Be aware of what you are signing',
          'Malicious dApps can use signatures for phishing',
          'This does NOT authorize spending tokens/ETH',
          'Different from transaction signing'
        ]
      },
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
        'signing failed': 'Check that private key is valid and message is properly formatted'
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
