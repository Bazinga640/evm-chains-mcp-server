/**
 * EVM Set Approval For All Tool
 *
 * Approve or revoke operator permissions to manage all NFTs
 */

import { z } from 'zod';
import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  contractAddress: z.string().describe('NFT contract address'),
  operator: z.string().describe('Operator address to approve/revoke'),
  approved: z.boolean().describe('True to approve, false to revoke'),
  privateKey: z.string().describe('Private key of NFT owner')
});

// Minimal ERC-721 ABI for setApprovalForAll() function
const ERC721_SET_APPROVAL_FOR_ALL_ABI = [
  'function setApprovalForAll(address operator, bool approved)'
];

export async function handleSetApprovalForAll(args: z.infer<typeof inputSchema>) {
  const startTime = Date.now();
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);

    const wallet = new ethers.Wallet(validated.privateKey, provider);
    const contract = new ethers.Contract(validated.contractAddress, ERC721_SET_APPROVAL_FOR_ALL_ABI, wallet);

    const tx = await contract.setApprovalForAll(validated.operator, validated.approved);
    const receipt = await tx.wait();

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          contractAddress: validated.contractAddress,
          operator: validated.operator,
          approved: validated.approved,
          transactionHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          executionTime: `${Date.now() - startTime}ms`
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error.message,
          chain: validated.chain,
          contractAddress: validated.contractAddress,
          operator: validated.operator,
          executionTime: `${Date.now() - startTime}ms`
        }, null, 2)
      }]
    };
  }
}
