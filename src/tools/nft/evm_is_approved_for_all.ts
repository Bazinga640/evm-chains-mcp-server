/**
 * EVM Is Approved For All Tool
 *
 * Check if an operator is approved to manage all NFTs for an owner
 */

import { z } from 'zod';
import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  contractAddress: z.string().describe('NFT contract address'),
  owner: z.string().describe('Owner address'),
  operator: z.string().describe('Operator address to check')
});

// Minimal ERC-721 ABI for isApprovedForAll() function
const ERC721_IS_APPROVED_FOR_ALL_ABI = [
  'function isApprovedForAll(address owner, address operator) view returns (bool)'
];

export async function handleIsApprovedForAll(args: z.infer<typeof inputSchema>) {
  const startTime = Date.now();
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);

    const contract = new ethers.Contract(validated.contractAddress, ERC721_IS_APPROVED_FOR_ALL_ABI, provider);
    const isApproved = await contract.isApprovedForAll(validated.owner, validated.operator);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          contractAddress: validated.contractAddress,
          owner: validated.owner,
          operator: validated.operator,
          isApproved,
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
          owner: validated.owner,
          operator: validated.operator,
          executionTime: `${Date.now() - startTime}ms`
        }, null, 2)
      }]
    };
  }
}
