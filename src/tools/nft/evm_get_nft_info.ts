/**
 * EVM Get NFT Info Tool
 *
 * Get comprehensive information about an NFT including name, symbol, and token URI
 */

import { z } from 'zod';
import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  contractAddress: z.string().describe('NFT contract address'),
  tokenId: z.string().describe('Token ID to query')
});

// Minimal ERC-721 ABI for NFT info queries
const ERC721_INFO_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function ownerOf(uint256 tokenId) view returns (address)'
];

export async function handleGetNftInfo(args: z.infer<typeof inputSchema>) {
  const startTime = Date.now();
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);

    const contract = new ethers.Contract(validated.contractAddress, ERC721_INFO_ABI, provider);

    const [name, symbol, tokenURI, owner] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.tokenURI(validated.tokenId),
      contract.ownerOf(validated.tokenId)
    ]);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          contractAddress: validated.contractAddress,
          tokenId: validated.tokenId,
          name,
          symbol,
          tokenURI,
          owner,
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
