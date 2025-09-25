/**
 * Get NFT metadata and ownership information
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

// ERC721 Metadata ABI
const ERC721_METADATA_ABI = [
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function name() view returns (string)',
  'function symbol() view returns (string)'
];

export async function handleGetNftMetadata(args: {
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

    const nftContract = new ethers.Contract(contractAddress, ERC721_METADATA_ABI, provider);

    // Fetch all metadata in parallel
    const [owner, tokenURI, name, symbol] = await Promise.all([
      nftContract.ownerOf(tokenId),
      nftContract.tokenURI(tokenId).catch(() => 'Not available'),
      nftContract.name().catch(() => 'Unknown'),
      nftContract.symbol().catch(() => 'Unknown')
    ]);

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      nft: {
        contract: contractAddress,
        tokenId: args.tokenId,
        name,
        symbol,
        owner,
        tokenURI,
        metadata: tokenURI.startsWith('http')
          ? 'Fetch from tokenURI to get full metadata'
          : tokenURI.startsWith('data:')
          ? 'Base64 encoded metadata (decode to view)'
          : 'Custom or IPFS URI'
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
        'invalid token ID': 'Token ID exceeds collection supply'
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
