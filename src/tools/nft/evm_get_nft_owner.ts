/**
 * Get owner of specific NFT
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

// ERC721 Owner ABI
const ERC721_OWNER_ABI = [
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function tokenURI(uint256 tokenId) view returns (string)'
];

export async function handleGetNftOwner(args: {
  chain: string;
  contractAddress: string;
  tokenId: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    const config = clientManager.getChainConfig(args.chain);
    const provider = clientManager.getProvider(args.chain);

    const contractAddress = clientManager.getChecksumAddress(args.contractAddress);
    const tokenId = BigInt(args.tokenId);

    const nftContract = new ethers.Contract(contractAddress, ERC721_OWNER_ABI, provider);

    // Fetch owner and collection info
    const [owner, name, symbol, tokenURI] = await Promise.all([
      nftContract.ownerOf(tokenId),
      nftContract.name().catch(() => 'Unknown'),
      nftContract.symbol().catch(() => 'Unknown'),
      nftContract.tokenURI(tokenId).catch(() => 'Not available')
    ]);

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      collection: {
        contract: contractAddress,
        name,
        symbol
      },
      nft: {
        tokenId: args.tokenId,
        owner,
        tokenURI
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
        'token does not exist': 'NFT has not been minted yet',
        'invalid token ID': 'Token ID exceeds collection supply',
        'owner query for nonexistent token': 'Token does not exist or has been burned'
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
