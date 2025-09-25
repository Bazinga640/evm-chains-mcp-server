/**
 * EVM Get NFTs By Owner Tool
 *
 * Get all NFT token IDs owned by an address in a collection
 * Note: This uses ERC721Enumerable extension. Not all NFT contracts support this.
 */

import { z } from 'zod';
import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  contractAddress: z.string().describe('NFT contract address'),
  owner: z.string().describe('Owner address'),
  limit: z.number().optional().describe('Maximum number of NFTs to return (default: 100)')
});

// ERC721Enumerable ABI for querying owned tokens
const ERC721_ENUMERABLE_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)'
];

export async function handleGetNftsByOwner(args: z.infer<typeof inputSchema>) {
  const startTime = Date.now();
  const validated = inputSchema.parse(args);
  const limit = validated.limit ?? 100;

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);

    const contract = new ethers.Contract(validated.contractAddress, ERC721_ENUMERABLE_ABI, provider);

    // Get total balance
    const balance = await contract.balanceOf(validated.owner);
    const balanceNum = Number(balance);

    if (balanceNum === 0) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            chain: validated.chain,
            contractAddress: validated.contractAddress,
            owner: validated.owner,
            balance: 0,
            tokenIds: [],
            executionTime: `${Date.now() - startTime}ms`
          }, null, 2)
        }]
      };
    }

    // Fetch token IDs (up to limit)
    const numToFetch = Math.min(balanceNum, limit);
    const tokenIdPromises = [];
    for (let i = 0; i < numToFetch; i++) {
      tokenIdPromises.push(contract.tokenOfOwnerByIndex(validated.owner, i));
    }

    const tokenIds = await Promise.all(tokenIdPromises);
    const tokenIdStrings = tokenIds.map(id => id.toString());

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          contractAddress: validated.contractAddress,
          owner: validated.owner,
          balance: balanceNum,
          tokenIds: tokenIdStrings,
          totalFetched: tokenIdStrings.length,
          hasMore: balanceNum > limit,
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
          note: 'This tool requires ERC721Enumerable extension. Not all NFT contracts support this.',
          executionTime: `${Date.now() - startTime}ms`
        }, null, 2)
      }]
    };
  }
}
