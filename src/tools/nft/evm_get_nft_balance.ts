/**
 * Get NFT balance (number of NFTs owned by address)
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

// ERC721 Balance ABI
const ERC721_BALANCE_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)'
];

export async function handleGetNftBalance(args: {
  chain: string;
  contractAddress: string;
  address: string;
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
    const ownerAddress = clientManager.getChecksumAddress(args.address);

    const nftContract = new ethers.Contract(contractAddress, ERC721_BALANCE_ABI, provider);

    // Fetch balance and collection info
    const [balance, name, symbol, totalSupply] = await Promise.all([
      nftContract.balanceOf(ownerAddress),
      nftContract.name().catch(() => 'Unknown'),
      nftContract.symbol().catch(() => 'Unknown'),
      nftContract.totalSupply().catch(() => null)
    ]);

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      collection: {
        contract: contractAddress,
        name,
        symbol,
        totalSupply: totalSupply ? totalSupply.toString() : 'Not available'
      },
      balance: {
        address: ownerAddress,
        nftCount: balance.toString(),
        note: 'Use NFT indexers to get individual token IDs owned'
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
        'invalid address': 'Check address format',
        'not an ERC721': 'Contract does not implement ERC721 interface'
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
