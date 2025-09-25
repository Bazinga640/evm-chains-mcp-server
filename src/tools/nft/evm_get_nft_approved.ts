/**
 * EVM Get NFT Approved Tool
 *
 * Get the approved address for a specific NFT token ID
 */

import { z } from 'zod';
import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  contractAddress: z.string().describe('NFT contract address'),
  tokenId: z.string().describe('Token ID to query')
});

// Minimal ERC-721 ABI for getApproved() function
const ERC721_GET_APPROVED_ABI = [
  'function getApproved(uint256 tokenId) view returns (address)'
];

export async function handleGetNftApproved(args: z.infer<typeof inputSchema>) {
  const startTime = Date.now();
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);

    const contract = new ethers.Contract(validated.contractAddress, ERC721_GET_APPROVED_ABI, provider);
    const approved = await contract.getApproved(validated.tokenId);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          contractAddress: validated.contractAddress,
          tokenId: validated.tokenId,
          approved,
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
          tokenId: validated.tokenId,
          executionTime: `${Date.now() - startTime}ms`
        }, null, 2)
      }]
    };
  }
}
