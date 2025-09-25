/**
 * Approve NFT spending (for marketplace or transfer delegation)
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

// ERC721 Approval ABI
const ERC721_APPROVAL_ABI = [
  'function approve(address to, uint256 tokenId) public',
  'function setApprovalForAll(address operator, bool approved) public',
  'function getApproved(uint256 tokenId) view returns (address)',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  'function ownerOf(uint256 tokenId) view returns (address)'
];

export async function handleApproveNft(args: {
  chain: string;
  contractAddress: string;
  spender: string;
  tokenId?: string;
  approveAll?: boolean;
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
    const spenderAddress = clientManager.getChecksumAddress(args.spender);

    const nftContract = new ethers.Contract(contractAddress, ERC721_APPROVAL_ABI, wallet);

    let tx;
    let approvalType: string;

    if (args.approveAll) {
      // Approve all NFTs in collection for operator
      tx = await nftContract.setApprovalForAll(spenderAddress, true);
      approvalType = 'All NFTs in collection';
    } else if (args.tokenId) {
      // Approve specific token
      const tokenId = BigInt(args.tokenId);

      // Verify ownership
      const owner = await nftContract.ownerOf(tokenId);
      if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
        throw new Error(`Wallet does not own token ${args.tokenId}`);
      }

      tx = await nftContract.approve(spenderAddress, tokenId);
      approvalType = `Token ID ${args.tokenId}`;
    } else {
      throw new Error('Must provide either tokenId or approveAll=true');
    }

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      approval: {
        contract: contractAddress,
        spender: spenderAddress,
        type: approvalType,
        owner: wallet.address
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
        'not owner': 'Cannot approve NFT you do not own',
        'approve caller is not owner': 'Not authorized to approve this NFT'
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
