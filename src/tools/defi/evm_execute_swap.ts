/**
 * Execute token swap on DEX
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

// Uniswap V2 Router ABI (minimal for swap)
const ROUTER_ABI = [
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function decimals() external view returns (uint8)'
];

export async function handleExecuteSwap(args: {
  chain: string;
  dex: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  slippageTolerance: string;
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

    const tokenInAddress = clientManager.getChecksumAddress(args.tokenIn);
    const tokenOutAddress = clientManager.getChecksumAddress(args.tokenOut);

    // DEX router addresses
    const dexRouters: Record<string, Record<string, string>> = {
      ethereum: { uniswap: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D' },
      polygon: { quickswap: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff' },
      avalanche: { traderjoe: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4' },
      bsc: { pancakeswap: '0x10ED43C718714eb63d5aA57B78B54704E256024E' },
      arbitrum: { sushiswap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506' },
      base: { baseswap: '0x327Df1E6de05895d2ab08513aaDD9313Fe505d86' }
      // worldchain: DEX not yet available on testnet - swaps not supported
    };

    const routerAddress = dexRouters[args.chain]?.[args.dex.toLowerCase()];
    if (!routerAddress) {
      throw new Error(`DEX ${args.dex} not supported on ${args.chain}`);
    }

    // Check if router contract exists
    const routerCode = await provider.getCode(routerAddress);
    if (routerCode === '0x') {
      throw new Error(`DEX router contract not deployed at ${routerAddress} on ${args.chain}. This may be a mainnet-only DEX or incorrect router address for testnet.`);
    }

    const router = new ethers.Contract(routerAddress, ROUTER_ABI, wallet);
    const slippage = parseFloat(args.slippageTolerance) / 100;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

    // Check if native token and parse amount with correct decimals (HIGH priority bug fix)
    const isNativeToken = tokenInAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    let amountInWei;

    if (isNativeToken) {
      // Native token (ETH) - use parseEther (18 decimals)
      amountInWei = ethers.parseEther(args.amountIn);
    } else {
      // ERC-20 token - fetch actual decimals and use parseUnits
      const tokenContract = new ethers.Contract(tokenInAddress, ERC20_ABI, wallet);
      const decimals = await tokenContract.decimals();
      amountInWei = ethers.parseUnits(args.amountIn, decimals);

      // Approve token spending
      const approveTx = await tokenContract.approve(routerAddress, amountInWei);
      await approveTx.wait();
    }

    // Calculate minimum output with slippage
    const path = [tokenInAddress, tokenOutAddress];
    const amountOutMin = amountInWei * BigInt(Math.floor((1 - slippage) * 1000)) / BigInt(1000);

    let tx;
    if (isNativeToken) {
      tx = await router.swapExactETHForTokens(
        amountOutMin,
        path,
        wallet.address,
        deadline,
        { value: amountInWei }
      );
    } else {
      tx = await router.swapExactTokensForTokens(
        amountInWei,
        amountOutMin,
        path,
        wallet.address,
        deadline
      );
    }

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      swap: {
        dex: args.dex,
        tokenIn: tokenInAddress,
        tokenOut: tokenOutAddress,
        amountIn: args.amountIn,
        slippageTolerance: args.slippageTolerance
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
    // Enhanced error detection
    let specificError = error.message;
    const troubleshooting: Record<string, string> = {};

    if (error.message.includes('could not decode result') || error.message.includes('BAD_DATA')) {
      specificError = 'Router returned empty data (0x). This usually means the router is not deployed or the DEX is not available on this network.';
      troubleshooting['mainnet_only_dex'] = `${args.dex} may only be available on mainnet, not ${args.chain} testnet`;
      troubleshooting['router_not_deployed'] = 'Router contract may not be deployed at the configured address on testnet';
      troubleshooting['use_alternative'] = 'Try a different DEX that supports this testnet';
    } else if (error.message.includes('router contract not deployed')) {
      troubleshooting['testnet_unavailable'] = `${args.dex} appears to be mainnet-only. Check if there's a testnet deployment`;
      troubleshooting['use_alternative'] = 'Try a different DEX that supports this testnet';
    } else if (error.message.includes('insufficient funds') || error.message.includes('insufficient balance')) {
      troubleshooting['insufficient_funds'] = 'Wallet does not have enough tokens or ETH for swap';
      troubleshooting['check_balance'] = 'Verify token/ETH balance before swapping';
    } else if (error.message.includes('slippage')) {
      troubleshooting['excessive_slippage'] = 'Price changed beyond tolerance during transaction';
      troubleshooting['increase_slippage'] = 'Try increasing slippage tolerance parameter';
    } else if (error.message.includes('insufficient liquidity')) {
      troubleshooting['no_liquidity'] = 'Trading pair may not have sufficient liquidity';
      troubleshooting['check_pool'] = 'Verify liquidity pool exists for this token pair';
    } else {
      troubleshooting['insufficient_funds'] = 'Not enough tokens or ETH for swap';
      troubleshooting['excessive_slippage'] = 'Price moved beyond slippage tolerance';
      troubleshooting['approval_failed'] = 'Token approval may have failed - check allowances';
    }

    const errorResponse = {
      success: false,
      error: specificError,
      chain: args.chain,
      dex: args.dex,
      tokenIn: args.tokenIn,
      tokenOut: args.tokenOut,
      timestamp: new Date().toISOString(),
      executionTime: `${Date.now() - startTime}ms`,
      troubleshooting,
      recommendation: `For testnet DEX swaps, ensure: (1) DEX supports testnet, (2) Sufficient token/ETH balance, (3) Reasonable slippage tolerance`,
      note: '⚠️ This is a TESTNET-ONLY server. Most DEX protocols (Uniswap, QuickSwap, etc.) are only deployed on mainnet. For production DeFi operations, use our evm-chains-mainnet-mcp-server with real assets.'
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(errorResponse, null, 2)
      }]
    };
  }
}
