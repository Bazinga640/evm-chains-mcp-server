import { ethers } from 'ethers';
import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

// Convert BigInt values to strings recursively to ensure JSON safety
function toJSONSafe(input: any): any {
  if (typeof input === 'bigint') return input.toString();
  if (Array.isArray(input)) return input.map((v) => toJSONSafe(v));
  if (input && typeof input === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(input)) out[k] = toJSONSafe(v);
    return out;
  }
  return input;
}

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  privateKey: z.string().describe('Private key for signing'),
  domain: z.object({
    name: z.string(),
    version: z.string(),
    chainId: z.number().optional(),
    verifyingContract: z.string()
  }).describe('EIP-712 domain'),
  types: z.record(z.array(z.object({
    name: z.string(),
    type: z.string()
  }))).describe('Type definitions'),
  value: z.record(z.any()).describe('Data to sign'),
  purpose: z.string().optional().describe('Description of what this signature is for')
});

export async function handleSignTypedData(args: z.infer<typeof inputSchema>) {
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);
    const wallet = new ethers.Wallet(validated.privateKey, provider);

    // Get chain ID if not provided
    const network = await provider.getNetwork();
    const domain = {
      ...validated.domain,
      chainId: validated.domain.chainId || Number(network.chainId)
    };

    // Sign the typed data
    const signature = await wallet.signTypedData(domain, validated.types, validated.value);

    // Split signature
    const sig = ethers.Signature.from(signature);

    // Verify signature
    const recoveredAddress = ethers.verifyTypedData(domain, validated.types, validated.value, signature);

    if (recoveredAddress.toLowerCase() !== wallet.address.toLowerCase()) {
      throw new Error('Signature verification failed');
    }

    // Generate EIP-712 hash
    const typedDataHash = ethers.TypedDataEncoder.hash(domain, validated.types, validated.value);

    // Common use cases
    const commonUseCases: Record<string, any> = {
      metaTransaction: {
        description: 'Execute transaction without paying gas',
        relayerSubmits: true,
        exampleContracts: ['GSN (Gas Station Network)', 'Biconomy', 'Gelato']
      },
      permit: {
        description: 'ERC20 gasless approval',
        standard: 'EIP-2612',
        saves: '1 transaction + gas fees'
      },
      governance: {
        description: 'Off-chain voting with on-chain verification',
        platforms: ['Snapshot', 'Tally', 'Boardroom']
      },
      orderSigning: {
        description: 'Sign orders for DEX or marketplace',
        examples: ['Uniswap X', 'OpenSea', 'LooksRare', '0x Protocol']
      },
      authentication: {
        description: 'Sign-in with Ethereum',
        standard: 'EIP-4361 (SIWE)',
        benefit: 'Prove wallet ownership without transaction'
      }
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          signer: wallet.address,
          purpose: validated.purpose || 'Generic EIP-712 signature',
          domain: domain,
          typedDataHash,
          signature: {
            compact: signature,
            split: {
              v: sig.v,
              r: sig.r,
              s: sig.s
            }
          },
          verification: {
            recoveredSigner: recoveredAddress,
            matches: recoveredAddress.toLowerCase() === wallet.address.toLowerCase()
          },
          usage: {
            submitToRelay: {
              method: 'POST to relay server',
              payload: {
                domain,
                types: validated.types,
                // Ensure payload is JSON-serializable even if value contains BigInt
                value: toJSONSafe(validated.value),
                signature
              }
            },
            verifyOnChain: {
              method: 'Contract calls ecrecover',
              example: `
address signer = ECDSA.recover(typedDataHash, signature);
require(signer == expectedSigner, "Invalid signature");
              `.trim()
            },
            verifyOffChain: {
              javascript: `
const recoveredAddress = ethers.verifyTypedData(
  domain,
  types,
  value,
  signature
);
              `.trim()
            }
          },
          commonUseCases,
          securityWarnings: [
            '⚠️ NEVER sign typed data you don\'t understand',
            '⚠️ Always verify domain.verifyingContract is correct',
            '⚠️ Check all message fields before signing',
            '⚠️ Signature gives permission - be cautious what you authorize',
            '⚠️ Malicious dApps can trick you into signing harmful messages'
          ],
          bestPractices: [
            'Read and understand all fields in the message',
            'Verify the verifyingContract address',
            'Check the chainId matches your network',
            'Use hardware wallet for high-value signatures',
            'Keep signatures private unless needed for submission',
            'Understand what contract will do with your signature'
          ],
          examples: {
            uniswapXOrder: {
              purpose: 'Sign swap order for Uniswap X',
              types: {
                Order: [
                  { name: 'info', type: 'OrderInfo' },
                  { name: 'decayStartTime', type: 'uint256' },
                  { name: 'decayEndTime', type: 'uint256' },
                  { name: 'exclusiveFiller', type: 'address' },
                  { name: 'exclusivityOverrideBps', type: 'uint256' },
                  { name: 'input', type: 'InputToken' },
                  { name: 'outputs', type: 'OutputToken[]' }
                ]
              }
            },
            permit: {
              purpose: 'ERC20 gasless approval',
              types: {
                Permit: [
                  { name: 'owner', type: 'address' },
                  { name: 'spender', type: 'address' },
                  { name: 'value', type: 'uint256' },
                  { name: 'nonce', type: 'uint256' },
                  { name: 'deadline', type: 'uint256' }
                ]
              }
            },
            siwe: {
              purpose: 'Sign-In with Ethereum',
              types: {
                Message: [
                  { name: 'domain', type: 'string' },
                  { name: 'address', type: 'address' },
                  { name: 'statement', type: 'string' },
                  { name: 'uri', type: 'string' },
                  { name: 'version', type: 'string' },
                  { name: 'chainId', type: 'uint256' },
                  { name: 'nonce', type: 'string' },
                  { name: 'issuedAt', type: 'string' }
                ]
              }
            }
          }
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error.message,
          chain: validated.chain,
          commonErrors: {
            'invalid signer': 'Private key or domain parameters are incorrect',
            'unsupported operation': 'Check types object is properly formatted',
            'invalid type': 'EIP-712 type must be valid Solidity type',
            'missing EIP712Domain': 'Domain object is required'
          },
          validTypes: [
            'address', 'bool', 'string', 'bytes', 'bytes32',
            'uint8', 'uint256', 'int256',
            'Custom[] (for arrays)'
          ],
          help: 'Ensure domain, types, and message match the contract\'s expected format'
        }, null, 2)
      }]
    };
  }
}
