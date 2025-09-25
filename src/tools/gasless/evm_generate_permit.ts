import { ethers } from 'ethers';
import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  tokenAddress: z.string().describe('ERC20 token address (must support EIP-2612)'),
  owner: z.string().describe('Token owner address'),
  spender: z.string().describe('Address to approve'),
  value: z.string().describe('Amount to approve'),
  privateKey: z.string().describe('Private key of token owner'),
  deadline: z.number().optional().describe('Unix timestamp deadline (default: 1 hour from now)')
});

export async function handleGeneratePermit(args: z.infer<typeof inputSchema>) {
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);
    const wallet = new ethers.Wallet(validated.privateKey, provider);

    // Verify owner matches private key
    if (wallet.address.toLowerCase() !== validated.owner.toLowerCase()) {
      throw new Error('Private key does not match owner address');
    }

    // ERC20 Permit ABI (EIP-2612)
    const permitABI = [
      'function name() view returns (string)',
      'function nonces(address owner) view returns (uint256)',
      'function DOMAIN_SEPARATOR() view returns (bytes32)',
      'function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)',
      'function decimals() view returns (uint8)',
      'function symbol() view returns (string)'
    ];

    const token = new ethers.Contract(validated.tokenAddress, permitABI, provider);

    // Get token details
    let tokenName: string;
    let nonce: bigint;
    let decimals: number;
    let symbol: string;

    try {
      const [rawName, rawNonce, rawDecimals, rawSymbol] = await Promise.all([
        token.name(),
        token.nonces(validated.owner),
        token.decimals(),
        token.symbol()
      ]);

      // Safely convert to expected types (some testnet tokens return wrong types)
      tokenName = String(rawName);
      nonce = BigInt(rawNonce);
      decimals = Number(rawDecimals);
      symbol = String(rawSymbol);
    } catch (error: any) {
      throw new Error(`Token does not support EIP-2612 permit: ${error.message}`);
    }

    // Get chain ID
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId); // Convert BigInt to number for JSON serialization

    // Set deadline (default 1 hour from now)
    const deadline = validated.deadline || Math.floor(Date.now() / 1000) + 3600;

    // Parse amount
    const valueWei = ethers.parseUnits(validated.value, decimals);

    // EIP-712 Domain
    const domain = {
      name: tokenName,
      version: '1',
      chainId: chainId,
      verifyingContract: validated.tokenAddress
    };

    // Permit type
    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
      ]
    };

    // Permit data - ethers.js signTypedData can handle BigInt directly
    const value = {
      owner: validated.owner,
      spender: validated.spender,
      value: valueWei,  // BigInt is fine here for EIP-712 signing
      nonce: nonce,      // BigInt is fine here for EIP-712 signing
      deadline: deadline
    };

    // Sign the permit
    let signature: string;
    try {
      signature = await wallet.signTypedData(domain, types, value);
    } catch (signError: any) {
      // If signing fails due to BigInt serialization, provide helpful error
      if (signError.message && signError.message.includes('BigInt')) {
        throw new Error('EIP-712 signing failed. This token may not properly support EIP-2612 permit standard.');
      }
      throw signError;
    }

    // Split signature into v, r, s
    const sig = ethers.Signature.from(signature);

    // Convert signature components for JSON serialization
    const sigV = Number(sig.v);
    const sigR = sig.r;
    const sigS = sig.s;

    // Verify signature locally
    const recoveredAddress = ethers.verifyTypedData(domain, types, value, signature);
    if (recoveredAddress.toLowerCase() !== validated.owner.toLowerCase()) {
      throw new Error('Signature verification failed');
    }

    // Generate the transaction data for permit call
    const permitInterface = new ethers.Interface(permitABI);
    const permitCalldata = permitInterface.encodeFunctionData('permit', [
      validated.owner,
      validated.spender,
      valueWei,
      deadline,
      sigV,
      sigR,
      sigS
    ]);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          token: {
            address: validated.tokenAddress,
            name: tokenName,
            symbol: symbol,
            decimals: decimals
          },
          permit: {
            owner: validated.owner,
            spender: validated.spender,
            value: validated.value,
            valueWei: valueWei.toString(),
            nonce: nonce.toString(),
            deadline: deadline,
            deadlineDate: new Date(deadline * 1000).toISOString()
          },
          signature: {
            compact: signature,
            split: {
              v: sigV,
              r: sigR,
              s: sigS
            },
            recoveredSigner: recoveredAddress
          },
          usage: {
            method1_directCall: {
              to: validated.tokenAddress,
              data: permitCalldata,
              description: 'Call permit() directly to activate approval'
            },
            method2_metaTransaction: {
              signature,
              params: {
                owner: validated.owner,
                spender: validated.spender,
                value: valueWei.toString(),
                deadline: deadline,
                v: sigV,
                r: sigR,
                s: sigS
              },
              description: 'Include in meta-transaction for gasless approval'
            },
            method3_contractIntegration: {
              permitFirst: true,
              thenExecute: 'Contract can now use transferFrom() without prior approve() transaction',
              benefit: 'Saves 1 transaction and gas fees'
            }
          },
          advantages: [
            'No approve() transaction needed',
            'Saves gas fees for token holder',
            'Enables gasless token transfers',
            'Can be batched with other operations',
            'Signature can be used by relayers'
          ],
          securityNotes: [
            'Signature is only valid until deadline',
            'One-time use only (nonce increments)',
            'Cannot be cancelled once signed',
            'Spender can use approval anytime before deadline',
            'Ensure spender contract is trusted'
          ],
          exampleIntegration: {
            javascript: `
// Relayer can submit this permit on behalf of user
const tx = await token.permit(
  "${validated.owner}",
  "${validated.spender}",
  "${valueWei.toString()}",
  ${deadline},
  ${sigV},
  "${sigR}",
  "${sigS}"
);

// Then immediately use the approval
await spenderContract.doSomething(/* uses transferFrom */);
            `.trim(),
            solidity: `
// Contract can verify and use permit in one transaction
token.permit(owner, spender, value, deadline, v, r, s);
token.transferFrom(owner, recipient, amount);
            `.trim()
          }
        }, null, 2)
      }]
    };
  } catch (error: any) {
    // Extract error message safely (error object may contain BigInt values)
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: errorMessage,
          chain: validated.chain,
          tokenAddress: validated.tokenAddress,
          commonIssues: {
            'does not support EIP-2612': 'Token must implement permit() function',
            'Private key does not match': 'Owner address must match private key',
            'insufficient allowance': 'This is for creating approvals, not checking them',
            'execution reverted': 'Token contract may not support EIP-2612 standard'
          },
          supportedTokens: [
            'USDC, USDT, DAI (on most chains)',
            'Most modern ERC20 tokens',
            'Uniswap V2/V3 LP tokens',
            'Aave aTokens',
            'Compound cTokens'
          ],
          checkSupport: 'Call token.DOMAIN_SEPARATOR() to verify EIP-2612 support'
        }, null, 2)
      }]
    };
  }
}
