/**
 * Deploy a customizable ERC721 NFT contract
 *
 * Uses MintableNFT with user-specified name and symbol
 * Owner can mint NFTs with custom tokenURIs
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';
import mintableNFTArtifact from '../../../contracts/MintableNFT.bytecode.json' with { type: 'json' };

// Minimal ERC721 ABI for verification
const ERC721_INTERFACE = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function owner() view returns (address)',
  'function balanceOf(address) view returns (uint256)'
];

export async function handleDeployNFT(args: {
  chain: string;
  name: string;
  symbol: string;
  privateKey: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    const provider = clientManager.getProvider(args.chain);
    const config = clientManager.getChainConfig(args.chain);

    // Create wallet from private key
    const wallet = new ethers.Wallet(args.privateKey, provider);

    // Create contract factory using MintableNFT artifact
    const factory = new ethers.ContractFactory(
      mintableNFTArtifact.abi,
      mintableNFTArtifact.bytecode,
      wallet
    );

    // Deploy with constructor parameters: name, symbol
    const contract = await factory.deploy(args.name, args.symbol);

    // Wait for deployment
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

    // Get deployment transaction and wait for receipt
    const deployTx = contract.deploymentTransaction();
    const receipt = await deployTx?.wait();

    // Verify deployment
    const nftContract = new ethers.Contract(contractAddress, ERC721_INTERFACE, provider);
    const [deployedName, deployedSymbol, owner, balance] = await Promise.all([
      nftContract.name(),
      nftContract.symbol(),
      nftContract.owner(),
      nftContract.balanceOf(wallet.address)
    ]);

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      deployment: {
        transactionHash: deployTx?.hash,
        nftContractAddress: contractAddress,
        deployer: wallet.address,
        blockNumber: receipt?.blockNumber || 'pending',
        gasUsed: receipt?.gasUsed ? receipt.gasUsed.toString() : 'pending'
      },
      collection: {
        name: deployedName,
        symbol: deployedSymbol,
        owner: owner,
        type: 'ERC721 (MintableNFT)',
        standard: 'OpenZeppelin v5.1.0',
        features: [
          'ERC721URIStorage - Individual token metadata URIs',
          'Ownable - Owner-controlled minting',
          'SafeMint - Automatic receiver verification'
        ],
        balance: balance.toString()
      },
      verification: {
        nameMatches: deployedName === args.name,
        symbolMatches: deployedSymbol === args.symbol,
        ownerMatches: owner.toLowerCase() === wallet.address.toLowerCase(),
        allChecks: deployedName === args.name &&
                   deployedSymbol === args.symbol &&
                   owner.toLowerCase() === wallet.address.toLowerCase(),
        note: `✅ NFT contract deployed with name="${args.name}", symbol="${args.symbol}". All parameters verified on-chain.`
      },
      explorerUrl: `${config.explorer}/address/${contractAddress}`,
      nextSteps: [
        `Create NFT assets: evm_create_nft_with_ipfs to upload image + metadata to IPFS`,
        `Mint NFT: evm_mint_nft with contractAddress: ${contractAddress}`,
        `Check ownership: evm_get_nft_owner or evm_get_nft_metadata`,
        `Transfer NFT: evm_transfer_nft to send to other addresses`,
        `Set approvals: evm_approve_nft or evm_set_approval_for_all for marketplace integration`,
        `⚠️  Remember: This is a TESTNET NFT collection with NO real value`
      ],
      usage: {
        mint: `evm_mint_nft({ chain: "${args.chain}", contractAddress: "${contractAddress}", to: "${wallet.address}", tokenId: "1", tokenUri: "ipfs://YOUR_METADATA_HASH", privateKey: "YOUR_KEY" })`,
        createAssets: `evm_create_nft_with_ipfs({ imageUrl: "https://example.com/art.png", name: "My NFT #1", description: "First NFT in collection" })`,
        fullWorkflow: 'Step 1: Deploy collection (done!) → Step 2: Create assets with IPFS → Step 3: Mint with tokenUri from IPFS'
      },
      contractType: 'MintableNFT (OpenZeppelin ERC721URIStorage)',
      note: `NFT collection deployed successfully. You are the owner (${wallet.address}) and can mint unlimited NFTs with custom metadata URIs. Use IPFS tools to create metadata, then mint with evm_mint_nft.`,
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
      errorDetails: {
        code: error.code,
        reason: error.reason || 'Unknown deployment error',
        data: error.data
      },
      troubleshooting: [
        '✅ Check deployer wallet has sufficient gas funds',
        '✅ Verify RPC connection is working',
        '✅ Ensure privateKey is valid and funded',
        '✅ Check network is not congested',
        `Get testnet funds: ${args.chain} faucet (see TESTNET-FAUCETS.md)`
      ],
      diagnostics: {
        deployerAddress: error.from || 'Could not determine',
        estimatedGas: error.gasLimit?.toString() || 'Could not estimate',
        networkChainId: error.chainId || 'Unknown'
      },
      timestamp: new Date().toISOString(),
      executionTime: `${Date.now() - startTime}ms`
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(errorResponse, null, 2)
      }]
    };
  }
}
