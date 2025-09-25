/**
 * Deploy a customizable ERC20 token contract
 *
 * Uses DynamicERC20 with user-specified name and symbol
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';
import dynamicERC20Artifact from '../../../contracts/DynamicERC20.bytecode.json' with { type: 'json' };
import mintableBurnableArtifact from '../../../contracts/MintableBurnableERC20.bytecode.json' with { type: 'json' };

// Minimal ERC20 ABI for verification
const ERC20_INTERFACE = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)'
];

export async function handleDeployToken(args: {
  chain: string;
  name: string;
  symbol: string;
  initialSupply: string;
  privateKey: string;
  mintable?: boolean;
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

    // Convert initial supply to wei (18 decimals)
    const decimals = 18;
    const initialSupplyWei = ethers.parseUnits(args.initialSupply, decimals);

    // Choose artifact based on mintable parameter
    const artifact = args.mintable ? mintableBurnableArtifact : dynamicERC20Artifact;
    const tokenType = args.mintable ? 'MintableBurnableERC20 (OpenZeppelin)' : 'DynamicERC20 (Basic)';

    // Create contract factory using selected artifact
    const factory = new ethers.ContractFactory(
      artifact.abi,
      artifact.bytecode,
      wallet
    );

    // Deploy with constructor parameters: name, symbol, initialSupply
    const contract = await factory.deploy(args.name, args.symbol, initialSupplyWei);

    // Wait for deployment
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

    // Get deployment transaction and wait for receipt
    const deployTx = contract.deploymentTransaction();
    const receipt = await deployTx?.wait();

    // Verify deployment
    const tokenContract = new ethers.Contract(contractAddress, ERC20_INTERFACE, provider);
    const [deployedName, deployedSymbol, deployedDecimals, deployedTotalSupply, deployerBalance] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals(),
      tokenContract.totalSupply(),
      tokenContract.balanceOf(wallet.address)
    ]);

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      deployment: {
        transactionHash: deployTx?.hash,
        tokenAddress: contractAddress,
        deployer: wallet.address,
        blockNumber: receipt?.blockNumber || 'pending',
        gasUsed: receipt?.gasUsed ? receipt.gasUsed.toString() : 'pending'
      },
      token: {
        name: deployedName,
        symbol: deployedSymbol,
        decimals: Number(deployedDecimals),
        totalSupply: ethers.formatUnits(deployedTotalSupply, decimals),
        totalSupplyWei: deployedTotalSupply.toString(),
        deployerBalance: ethers.formatUnits(deployerBalance, decimals),
        deployerBalanceWei: deployerBalance.toString()
      },
      verification: {
        nameMatches: deployedName === args.name,
        symbolMatches: deployedSymbol === args.symbol,
        decimalsMatches: Number(deployedDecimals) === 18,
        supplyMatches: deployedTotalSupply.toString() === initialSupplyWei.toString(),
        allChecks: deployedName === args.name &&
                   deployedSymbol === args.symbol &&
                   Number(deployedDecimals) === 18 &&
                   deployedTotalSupply.toString() === initialSupplyWei.toString(),
        note: `✅ Token deployed with custom name="${args.name}", symbol="${args.symbol}". All parameters verified on-chain.`
      },
      explorerUrl: `${config.explorer}/address/${contractAddress}`,
      nextSteps: args.mintable ? [
        `Verify deployment: evm_get_token_info with tokenAddress: ${contractAddress}`,
        `Mint new tokens: evm_mint_token (owner only)`,
        `Burn tokens: evm_burn_token (anyone can burn their own)`,
        `Transfer ownership: Use contract's transferOwnership() if needed`,
        `Check your balance: evm_get_token_balance with address: ${wallet.address}`,
        `⚠️  Remember: This is a TESTNET token with NO real value`
      ] : [
        `Verify deployment: evm_get_token_info with tokenAddress: ${contractAddress}`,
        `Check your balance: evm_get_token_balance with address: ${wallet.address}`,
        `Transfer tokens: evm_transfer_token to send tokens to other addresses`,
        `Approve spending: evm_approve_token to allow DeFi protocols to use your tokens`,
        `⚠️  Remember: This is a TESTNET token with NO real value`
      ],
      tokenType,
      note: `Token deployed using ${tokenType}. ${args.mintable ? 'OpenZeppelin-based with mint/burn capabilities. Owner (' + wallet.address + ') can mint new tokens.' : 'Basic ERC20 with fixed supply.'}`,
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
        '✅ Try with smaller initialSupply if very large',
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
