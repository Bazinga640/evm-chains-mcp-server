/**
 * Mint a new NFT
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

// ERC721 Mintable ABI (matches MintableNFT.sol)
const ERC721_MINT_ABI = [
  'function mint(address to, uint256 tokenId, string memory uri) public',
  'function mint(address to, uint256 tokenId) public',
  'function safeMint(address to, uint256 tokenId) public'
];

export async function handleMintNft(args: {
  chain: string;
  contractAddress: string;
  to: string;
  tokenId: string;
  tokenUri?: string;
  privateKey: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    const config = clientManager.getChainConfig(args.chain);
    const provider = clientManager.getProvider(args.chain);
    const wallet = new ethers.Wallet(args.privateKey, provider);

    const contractAddress = clientManager.getChecksumAddress(args.contractAddress);
    const toAddress = clientManager.getChecksumAddress(args.to);
    const tokenId = BigInt(args.tokenId);

    const nftContract = new ethers.Contract(contractAddress, ERC721_MINT_ABI, wallet);

    let tx;
    if (args.tokenUri) {
      // Mint with metadata URI using the 3-parameter mint function
      tx = await nftContract['mint(address,uint256,string)'](toAddress, tokenId, args.tokenUri);
    } else {
      // Standard mint without URI - try 2-parameter mint first, fallback to safeMint
      try {
        tx = await nftContract['mint(address,uint256)'](toAddress, tokenId);
      } catch {
        tx = await nftContract.safeMint(toAddress, tokenId);
      }
    }

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      nft: {
        contract: contractAddress,
        tokenId: args.tokenId,
        recipient: toAddress,
        tokenUri: args.tokenUri || 'Not set'
      },
      transaction: {
        hash: tx.hash,
        status: 'pending'
      },
      explorer: clientManager.getTransactionExplorerUrl(args.chain, tx.hash),
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
        'missing mint function': 'Contract does not support standard mint functions',
        'access control': 'Only authorized minters can mint NFTs',
        'token already exists': 'Token ID already minted'
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
