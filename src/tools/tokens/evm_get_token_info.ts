/**
 * Get detailed ERC20 token information
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';
import { getErc20Contract } from '../../utils/erc20.js';
import { withValidatedAddress } from '../../utils/address-validator.js';
import { buildSuccessResponse, buildErrorResponse } from '../../utils/responses.js';

export async function handleGetTokenInfo(args: {
  chain: string;
  tokenAddress: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    const config = clientManager.getChainConfig(args.chain);
    const provider = clientManager.getProvider(args.chain);
    const tokenAddress = withValidatedAddress(args.tokenAddress, 'tokenAddress');

    // Check for known precompile contracts (not standard ERC20)
    const precompiles: Record<string, string[]> = {
      polygon: ['0x0000000000000000000000000000000000001010'] // POL precompile
    };

    if (precompiles[args.chain]?.some(addr => addr.toLowerCase() === tokenAddress.toLowerCase())) {
      throw new Error(`Address ${tokenAddress} is a precompile contract, not a standard ERC20 token`);
    }

    const contract = getErc20Contract(tokenAddress, provider, [
      'function name() view returns (string)',
      'function totalSupply() view returns (uint256)'
    ]);
    const code = await provider.getCode(tokenAddress);

    if (code === '0x') {
      throw new Error('No contract found at this address');
    }

    const [name, symbol, decimals, totalSupply] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.decimals(),
      contract.totalSupply()
    ]);

    const formattedSupply = ethers.formatUnits(totalSupply, decimals);

    return buildSuccessResponse({
      chain: args.chain,
      network: config.name,
      token: {
        address: tokenAddress,
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: {
          raw: totalSupply.toString(),
          formatted: formattedSupply,
          display: `${formattedSupply} ${symbol}`
        },
        standard: 'ERC20'
      },
      contract: {
        codeSize: `${(code.length - 2) / 2} bytes`,
        isVerified: 'Check on block explorer'
      },
      explorer: clientManager.getExplorerUrl(args.chain, tokenAddress),
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
        tip2: 'Check that the contract implements ERC20 interface (name, symbol, decimals, totalSupply)',
        tip3: `View contract on explorer: https://${args.chain === 'polygon' ? 'amoy.polygonscan.com' : 'etherscan.io'}/address/${args.tokenAddress}`,
        tip4: 'Ensure the contract is deployed and verified on the blockchain'
      };
    } else if (error.message.includes('No contract found at this address')) {
      errorMessage = `No contract deployed at address ${args.tokenAddress}`;
      troubleshootingTips = {
        tip1: 'The address may be an EOA (externally owned account), not a contract',
        tip2: 'Verify the contract address is correct',
        tip3: 'Ensure you are on the correct network'
      };
    } else if (error.message.includes('could not coalesce error')) {
      errorMessage = 'Contract call failed - the address may not be a valid ERC20 contract';
      troubleshootingTips = {
        tip1: 'The contract may not implement the required ERC20 functions',
        tip2: 'Verify the contract is deployed and functional',
        tip3: 'Check if the contract is verified on the block explorer'
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
      timestamp: new Date().toISOString(),
      executionTime: `${Date.now() - startTime}ms`,
      troubleshooting: troubleshootingTips
    });
  }
}
