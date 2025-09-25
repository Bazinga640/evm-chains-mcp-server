/**
 * Add liquidity to DEX pool
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

// Uniswap V2 Router ABI (minimal for liquidity)
const ROUTER_ABI = [
  'function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)',
  'function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function decimals() external view returns (uint8)'
];

export async function handleAddLiquidity(args: {
  chain: string;
  dex: string;
  tokenA: string;
  tokenB: string;
  amountA: string;
  amountB: string;
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

    const tokenAAddress = clientManager.getChecksumAddress(args.tokenA);
    const tokenBAddress = clientManager.getChecksumAddress(args.tokenB);

    // DEX router addresses
    const dexRouters: Record<string, Record<string, string>> = {
      ethereum: { uniswap: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D' },
      polygon: { quickswap: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff' },
      avalanche: { traderjoe: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4' },
      bsc: { pancakeswap: '0x10ED43C718714eb63d5aA57B78B54704E256024E' },
      arbitrum: { sushiswap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506' },
      base: { baseswap: '0x327Df1E6de05895d2ab08513aaDD9313Fe505d86' },
      worldchain: { worldswap: '0x0000000000000000000000000000000000000000' }
    };

    const routerAddress = dexRouters[args.chain]?.[args.dex.toLowerCase()];
    if (!routerAddress) {
      throw new Error(`DEX ${args.dex} not supported on ${args.chain}`);
    }

    if (routerAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error(`DEX ${args.dex} router not configured for ${args.chain}. This is a placeholder address.`);
    }

    // Check if router contract exists
    const routerCode = await provider.getCode(routerAddress);
    if (routerCode === '0x') {
      throw new Error(`DEX router contract not deployed at ${routerAddress} on ${args.chain}. This may be a mainnet-only DEX or incorrect router address for testnet.`);
    }

    const router = new ethers.Contract(routerAddress, ROUTER_ABI, wallet);

    // Create token contracts to fetch decimals
    const tokenAContract = new ethers.Contract(tokenAAddress, ERC20_ABI, wallet);
    const tokenBContract = new ethers.Contract(tokenBAddress, ERC20_ABI, wallet);

    // Fetch actual token decimals (HIGH priority bug fix)
    const [decimalsA, decimalsB] = await Promise.all([
      tokenAContract.decimals(),
      tokenBContract.decimals()
    ]);

    // Parse amounts with correct decimals (not parseEther which assumes 18)
    const amountAWei = ethers.parseUnits(args.amountA, decimalsA);
    const amountBWei = ethers.parseUnits(args.amountB, decimalsB);
    const slippage = parseFloat(args.slippageTolerance) / 100;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

    // Calculate minimum amounts with slippage
    const amountAMin = amountAWei * BigInt(Math.floor((1 - slippage) * 1000)) / BigInt(1000);
    const amountBMin = amountBWei * BigInt(Math.floor((1 - slippage) * 1000)) / BigInt(1000);

    const approveTxA = await tokenAContract.approve(routerAddress, amountAWei);
    await approveTxA.wait(); // Wait for approval to be mined
    const approveTxB = await tokenBContract.approve(routerAddress, amountBWei);
    await approveTxB.wait(); // Wait for approval to be mined

    // Add liquidity
    const tx = await router.addLiquidity(
      tokenAAddress,
      tokenBAddress,
      amountAWei,
      amountBWei,
      amountAMin,
      amountBMin,
      wallet.address,
      deadline
    );

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      liquidity: {
        dex: args.dex,
        tokenA: tokenAAddress,
        tokenB: tokenBAddress,
        amountA: args.amountA,
        amountB: args.amountB,
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
    } else if (error.message.includes('router not configured')) {
      troubleshooting['configuration_needed'] = 'This DEX needs a proper router address configured for the testnet';
    } else if (error.message.includes('router contract not deployed')) {
      troubleshooting['testnet_unavailable'] = `${args.dex} appears to be mainnet-only. Check if there's a testnet deployment`;
      troubleshooting['use_alternative'] = 'Try a different DEX that supports this testnet';
    } else if (error.message.includes('insufficient funds') || error.message.includes('insufficient balance')) {
      troubleshooting['insufficient_funds'] = 'Wallet does not have enough tokens for liquidity provision';
      troubleshooting['check_balances'] = 'Verify token balances before adding liquidity';
    } else if (error.message.includes('slippage')) {
      troubleshooting['excessive_slippage'] = 'Price ratio changed beyond tolerance during transaction';
      troubleshooting['increase_slippage'] = 'Try increasing slippage tolerance parameter';
    } else {
      troubleshooting['insufficient_funds'] = 'Not enough tokens for liquidity';
      troubleshooting['excessive_slippage'] = 'Price ratio changed beyond tolerance';
      troubleshooting['approval_failed'] = 'Token approval may have failed - check allowances';
    }

    const errorResponse = {
      success: false,
      error: specificError,
      chain: args.chain,
      dex: args.dex,
      tokenA: args.tokenA,
      tokenB: args.tokenB,
      timestamp: new Date().toISOString(),
      executionTime: `${Date.now() - startTime}ms`,
      troubleshooting,
      recommendation: `For testnet liquidity provision, ensure: (1) DEX supports testnet, (2) Sufficient token balances, (3) Reasonable slippage tolerance`,
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
