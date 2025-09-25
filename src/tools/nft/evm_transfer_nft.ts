/**
 * Transfer NFT to another address
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

// ERC721 Transfer ABI
const ERC721_TRANSFER_ABI = [
  'function transferFrom(address from, address to, uint256 tokenId) public',
  'function safeTransferFrom(address from, address to, uint256 tokenId) public',
  'function ownerOf(uint256 tokenId) view returns (address)'
];

export async function handleTransferNft(args: {
  chain: string;
  contractAddress: string;
  to: string;
  tokenId: string;
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

    const nftContract = new ethers.Contract(contractAddress, ERC721_TRANSFER_ABI, wallet);

    // Verify current owner
    const currentOwner = await nftContract.ownerOf(tokenId);
    if (currentOwner.toLowerCase() !== wallet.address.toLowerCase()) {
      throw new Error(`Wallet does not own token ${args.tokenId}. Current owner: ${currentOwner}`);
    }

    // Use safeTransferFrom (reverts if recipient cannot receive NFTs)
    const tx = await nftContract.safeTransferFrom(wallet.address, toAddress, tokenId);

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      nft: {
        contract: contractAddress,
        tokenId: args.tokenId,
        from: wallet.address,
        to: toAddress
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
        'not owner': 'Wallet does not own this NFT',
        'transfer to non ERC721Receiver': 'Recipient cannot receive NFTs',
        'transfer caller is not owner nor approved': 'Not authorized to transfer this NFT'
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
