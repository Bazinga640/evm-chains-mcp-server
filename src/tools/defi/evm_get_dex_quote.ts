/**
 * Get quote for token swap on DEX
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

// Uniswap V2 Router ABI + ERC20 for decimals
const ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)'
];

export async function handleGetDexQuote(args: {
  chain: string;
  dex: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    const config = clientManager.getChainConfig(args.chain);
    const provider = clientManager.getProvider(args.chain);
    const tokenInAddress = clientManager.getChecksumAddress(args.tokenIn);
    const tokenOutAddress = clientManager.getChecksumAddress(args.tokenOut);

    // DEX router addresses (hardcoded for common DEXes)
    const dexRouters: Record<string, Record<string, string>> = {
      ethereum: {
        uniswap: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
      },
      polygon: {
        quickswap: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
        sushiswap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      avalanche: {
        traderjoe: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4',
        pangolin: '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106'
      },
      bsc: {
        pancakeswap: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
        sushiswap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
      },
      arbitrum: {
        sushiswap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        camelot: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
      },
      base: {
        baseswap: '0x327Df1E6de05895d2ab08513aaDD9313Fe505d86',
        sushiswap: '0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891'
      },
      worldchain: {
        worldswap: '0x0000000000000000000000000000000000000000' // Placeholder
      }
    };

    const routerAddress = dexRouters[args.chain]?.[args.dex.toLowerCase()];
    if (!routerAddress) {
      throw new Error(`DEX ${args.dex} not supported on ${args.chain}`);
    }

    if (routerAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error(`DEX ${args.dex} router not configured for ${args.chain}. This is a placeholder address.`);
    }

    // Get token decimals for proper conversion
    const tokenInContract = new ethers.Contract(tokenInAddress, ERC20_ABI, provider);
    const tokenOutContract = new ethers.Contract(tokenOutAddress, ERC20_ABI, provider);

    const [tokenInDecimals, tokenOutDecimals] = await Promise.all([
      tokenInContract.decimals(),
      tokenOutContract.decimals()
    ]);

    // Check if router contract exists
    const routerCode = await provider.getCode(routerAddress);
    if (routerCode === '0x') {
      throw new Error(`DEX router contract not deployed at ${routerAddress} on ${args.chain}. This may be a mainnet-only DEX or incorrect router address for testnet.`);
    }

    const router = new ethers.Contract(routerAddress, ROUTER_ABI, provider);
    const path = [tokenInAddress, tokenOutAddress];

    // Use correct decimals for input token
    const amountInWei = ethers.parseUnits(args.amountIn, tokenInDecimals);

    const amounts = await router.getAmountsOut(amountInWei, path);

    // Use correct decimals for output token
    const amountOut = ethers.formatUnits(amounts[amounts.length - 1], tokenOutDecimals);

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      quote: {
        dex: args.dex,
        tokenIn: tokenInAddress,
        tokenOut: tokenOutAddress,
        amountIn: args.amountIn,
        amountOut,
        tokenInDecimals: Number(tokenInDecimals),
        tokenOutDecimals: Number(tokenOutDecimals),
        path,
        priceImpact: 'Not calculated',
        router: routerAddress,
        rate: `1 ${tokenInAddress} = ${(parseFloat(amountOut) / parseFloat(args.amountIn)).toFixed(6)} ${tokenOutAddress}`
      },
      warning: 'Quote may differ from actual execution due to slippage',
      note: `Using correct token decimals: ${tokenInDecimals} for input, ${tokenOutDecimals} for output`,
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
      specificError = 'Router returned empty data (0x). This usually means the trading pair has no liquidity or the router is not deployed.';
      troubleshooting['mainnet_only_dex'] = `${args.dex} may only be available on mainnet, not ${args.chain} testnet`;
      troubleshooting['no_liquidity'] = 'Trading pair may not have any liquidity pools';
      troubleshooting['router_not_deployed'] = 'Router contract may not be deployed at the configured address on testnet';
    } else if (error.message.includes('router not configured')) {
      troubleshooting['configuration_needed'] = 'This DEX needs a proper router address configured for the testnet';
    } else if (error.message.includes('router contract not deployed')) {
      troubleshooting['testnet_unavailable'] = `${args.dex} appears to be mainnet-only. Check if there's a testnet deployment`;
      troubleshooting['use_alternative'] = 'Try a different DEX that supports this testnet';
    } else {
      troubleshooting['insufficient_liquidity'] = 'Pool may not have enough liquidity for this trade';
      troubleshooting['invalid_path'] = 'Token pair may not have a direct pool - try adding intermediate tokens';
      troubleshooting['invalid_tokens'] = 'Verify both token addresses are correct and deployed on this network';
    }

    const errorResponse = {
      success: false,
      error: specificError,
      chain: args.chain,
      dex: args.dex,
      tokenIn: args.tokenIn,
      tokenOut: args.tokenOut,
      amountIn: args.amountIn,
      timestamp: new Date().toISOString(),
      executionTime: `${Date.now() - startTime}ms`,
      troubleshooting,
      recommendation: `For testnet DEX trading, ensure: (1) DEX supports testnet, (2) Trading pair has liquidity, (3) Router address is correct for testnet`,
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
