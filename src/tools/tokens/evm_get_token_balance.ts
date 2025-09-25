/**
 * Get ERC20 token balance for an address
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';
import { getErc20Contract } from '../../utils/erc20.js';
import { buildSuccessResponse, buildErrorResponse } from '../../utils/responses.js';

export async function handleGetTokenBalance(args: {
  chain: string;
  tokenAddress: string;
  walletAddress: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    // Validate inputs
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    if (!clientManager.isValidAddress(args.tokenAddress)) {
      throw new Error(`Invalid token address: ${args.tokenAddress}`);
    }

    if (!clientManager.isValidAddress(args.walletAddress)) {
      throw new Error(`Invalid wallet address: ${args.walletAddress}`);
    }

    const config = clientManager.getChainConfig(args.chain);
    const provider = clientManager.getProvider(args.chain);
    const tokenAddress = clientManager.getChecksumAddress(args.tokenAddress);
    const walletAddress = clientManager.getChecksumAddress(args.walletAddress);

    // Check for known precompile contracts (not standard ERC20)
    const precompiles: Record<string, string[]> = {
      polygon: ['0x0000000000000000000000000000000000001010'] // POL precompile
    };

    if (precompiles[args.chain]?.some(addr => addr.toLowerCase() === tokenAddress.toLowerCase())) {
      throw new Error(`Address ${tokenAddress} is a precompile contract, not a standard ERC20 token`);
    }

    // Create contract instance using shared helper (include name() fragment)
    const contract = getErc20Contract(tokenAddress, provider, [
      'function name() view returns (string)'
    ]);

    // Get token info and balance in parallel
    const [balance, decimals, symbol, name] = await Promise.all([
      contract.balanceOf(walletAddress),
      contract.decimals(),
      contract.symbol(),
      contract.name()
    ]);

    const formattedBalance = ethers.formatUnits(balance, decimals);

    return buildSuccessResponse({
      chain: args.chain,
      network: config.name,
      token: {
        address: tokenAddress,
        name,
        symbol,
        decimals: Number(decimals)
      },
      wallet: {
        address: walletAddress,
        balance: {
          raw: balance.toString(),
          formatted: formattedBalance,
          display: `${formattedBalance} ${symbol}`
        },
        hasBalance: balance > 0n
      },
      explorer: {
        token: clientManager.getExplorerUrl(args.chain, tokenAddress),
        wallet: clientManager.getExplorerUrl(args.chain, walletAddress)
      },
      executionTime: `${Date.now() - startTime}ms`
    });
  } catch (error: any) {
    // Provide more specific error messages
    let errorMessage = error.message;
    let troubleshootingTips: any = {};

    if (error.message.includes('call revert exception') || error.message.includes('execution reverted')) {
      errorMessage = `Contract at ${args.tokenAddress} does not implement ERC20 standard or call reverted`;
      troubleshootingTips = {
        tip1: 'Verify the contract address is correct',
        tip2: 'Check that the contract implements ERC20 interface (balanceOf, decimals, symbol, name)',
        tip3: `View contract on explorer: https://${args.chain === 'polygon' ? 'amoy.polygonscan.com' : 'etherscan.io'}/address/${args.tokenAddress}`,
        tip4: 'Ensure the contract is deployed and verified on the blockchain'
      };
    } else if (error.message.includes('invalid address') || error.message.includes('bad address checksum')) {
      errorMessage = 'Invalid address format';
      troubleshootingTips = {
        tip1: 'Ensure addresses are valid Ethereum addresses (0x + 40 hex characters)',
        tip2: 'Addresses are case-sensitive for checksummed addresses'
      };
    } else if (error.message.includes('could not coalesce error')) {
      errorMessage = 'Contract call failed - the address may not be a valid ERC20 contract';
      troubleshootingTips = {
        tip1: 'The address might not be a contract, or the contract may not be ERC20 compliant',
        tip2: 'Verify the contract is deployed at this address',
        tip3: 'Check if the contract implements the required ERC20 functions'
      };
    } else if (error.message.includes('could not decode result data') || error.message.includes('BAD_DATA')) {
      errorMessage = `Address ${args.tokenAddress} is an EOA (externally owned account), not a contract`;
      troubleshootingTips = {
        tip1: 'The address is a wallet/account, not a smart contract',
        tip2: 'Token contracts must be smart contracts, not regular addresses',
        tip3: 'Verify you have the correct contract address',
        tip4: `Check address on explorer: https://${args.chain === 'polygon' ? 'amoy.polygonscan.com' : 'etherscan.io'}/address/${args.tokenAddress}`
      };
    } else if (error.message.includes('precompile contract')) {
      errorMessage = `Address ${args.tokenAddress} is a blockchain precompile, not a standard ERC20 token`;
      troubleshootingTips = {
        tip1: 'Precompile contracts are built into the blockchain and not standard ERC20 tokens',
        tip2: 'For native token operations on Polygon, use the native POL token tools',
        tip3: 'Verify you have the correct ERC20 token contract address',
        tip4: `Precompile address: ${args.tokenAddress} cannot be queried as a regular token`
      };
    }

    return buildErrorResponse({
      error: errorMessage,
      originalError: error.message,
      chain: args.chain,
      tokenAddress: args.tokenAddress,
      walletAddress: args.walletAddress,
      timestamp: new Date().toISOString(),
      executionTime: `${Date.now() - startTime}ms`,
      troubleshooting: troubleshootingTips
    });
  }
}
