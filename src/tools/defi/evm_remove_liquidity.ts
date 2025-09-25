/**
 * Remove liquidity from DEX pool
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

// Uniswap V2 Router ABI (minimal for liquidity)
const ROUTER_ABI = [
  'function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)',
  'function removeLiquidityETH(address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external returns (uint amountToken, uint amountETH)'
];

const FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)'
];

const PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function decimals() external view returns (uint8)'
];

export async function handleRemoveLiquidity(args: {
  chain: string;
  dex: string;
  tokenA: string;
  tokenB: string;
  liquidityAmount: string;
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

    // DEX factory addresses
    const dexFactories: Record<string, Record<string, string>> = {
      ethereum: { uniswap: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f' },
      polygon: { quickswap: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32' },
      avalanche: { traderjoe: '0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10' },
      bsc: { pancakeswap: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73' },
      arbitrum: { sushiswap: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4' },
      base: { baseswap: '0xFDa619b6d20975be80A10332cD39b9a4b0FAa8BB' },
      worldchain: { worldswap: '0x0000000000000000000000000000000000000000' }
    };

    const routerAddress = dexRouters[args.chain]?.[args.dex.toLowerCase()];
    if (!routerAddress) {
      throw new Error(`DEX ${args.dex} not supported on ${args.chain}`);
    }

    if (routerAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error(`DEX ${args.dex} router not configured for ${args.chain}. This is a placeholder address.`);
    }

    const factoryAddress = dexFactories[args.chain]?.[args.dex.toLowerCase()];
    if (!factoryAddress) {
      throw new Error(`Factory for ${args.dex} not found on ${args.chain}`);
    }

    if (factoryAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error(`DEX ${args.dex} factory not configured for ${args.chain}. This is a placeholder address.`);
    }

    // Check if router and factory contracts exist
    const routerCode = await provider.getCode(routerAddress);
    if (routerCode === '0x') {
      throw new Error(`DEX router contract not deployed at ${routerAddress} on ${args.chain}. This may be a mainnet-only DEX or incorrect router address for testnet.`);
    }

    const factoryCode = await provider.getCode(factoryAddress);
    if (factoryCode === '0x') {
      throw new Error(`DEX factory contract not deployed at ${factoryAddress} on ${args.chain}. This may be a mainnet-only DEX or incorrect factory address for testnet.`);
    }

    // Get pair address from factory
    const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);
    const pairAddress = await factory.getPair(tokenAAddress, tokenBAddress);

    if (pairAddress === ethers.ZeroAddress) {
      throw new Error('Liquidity pool does not exist for this token pair');
    }

    // Create LP token contract (pair IS the LP token)
    const lpTokenContract = new ethers.Contract(pairAddress, ERC20_ABI, wallet);
    const lpDecimals = await lpTokenContract.decimals();

    // Parse liquidity amount with correct decimals
    const liquidityAmount = ethers.parseUnits(args.liquidityAmount, lpDecimals);

    // Get reserves for slippage calculation
    const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, provider);
    const [reserve0, reserve1] = await pairContract.getReserves();
    const token0 = await pairContract.token0();

    // Calculate minimum amounts based on reserves and slippage
    const slippage = parseFloat(args.slippageTolerance) / 100;
    const totalSupply = await lpTokenContract.totalSupply();

    // Calculate share of pool being removed
    const shareOfPool = Number(liquidityAmount) / Number(totalSupply);

    // Determine which reserve corresponds to which token
    const isToken0 = token0.toLowerCase() === tokenAAddress.toLowerCase();
    const reserveA = isToken0 ? reserve0 : reserve1;
    const reserveB = isToken0 ? reserve1 : reserve0;

    // Calculate expected outputs
    const expectedAmountA = BigInt(Math.floor(Number(reserveA) * shareOfPool));
    const expectedAmountB = BigInt(Math.floor(Number(reserveB) * shareOfPool));

    // Apply slippage tolerance
    const amountAMin = expectedAmountA * BigInt(Math.floor((1 - slippage) * 1000)) / BigInt(1000);
    const amountBMin = expectedAmountB * BigInt(Math.floor((1 - slippage) * 1000)) / BigInt(1000);

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

    // Approve LP tokens to router (CRITICAL FIX)
    const approveTx = await lpTokenContract.approve(routerAddress, liquidityAmount);
    await approveTx.wait(); // Wait for approval to be mined

    // Create router contract
    const router = new ethers.Contract(routerAddress, ROUTER_ABI, wallet);

    // Remove liquidity
    const tx = await router.removeLiquidity(
      tokenAAddress,
      tokenBAddress,
      liquidityAmount,
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
        liquidityAmount: args.liquidityAmount,
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
      specificError = 'Router/Factory returned empty data (0x). This usually means the DEX is not deployed or not available on this network.';
      troubleshooting['mainnet_only_dex'] = `${args.dex} may only be available on mainnet, not ${args.chain} testnet`;
      troubleshooting['router_not_deployed'] = 'Router or factory contract may not be deployed at the configured address on testnet';
      troubleshooting['use_alternative'] = 'Try a different DEX that supports this testnet';
    } else if (error.message.includes('router not configured') || error.message.includes('factory not configured')) {
      troubleshooting['configuration_needed'] = 'This DEX needs proper router/factory addresses configured for the testnet';
    } else if (error.message.includes('router contract not deployed') || error.message.includes('factory contract not deployed')) {
      troubleshooting['testnet_unavailable'] = `${args.dex} appears to be mainnet-only. Check if there's a testnet deployment`;
      troubleshooting['use_alternative'] = 'Try a different DEX that supports this testnet';
    } else if (error.message.includes('Liquidity pool does not exist')) {
      troubleshooting['pool_not_created'] = 'No liquidity pool has been created for this token pair';
      troubleshooting['check_pool'] = 'Verify a pool exists before trying to remove liquidity';
    } else if (error.message.includes('insufficient balance') || error.message.includes('insufficient LP')) {
      troubleshooting['insufficient_lp_tokens'] = 'Wallet does not have enough LP tokens for this withdrawal';
      troubleshooting['check_balance'] = 'Verify LP token balance before removing liquidity';
    } else if (error.message.includes('slippage')) {
      troubleshooting['excessive_slippage'] = 'Pool ratio changed beyond tolerance during transaction';
      troubleshooting['increase_slippage'] = 'Try increasing slippage tolerance parameter';
    } else {
      troubleshooting['insufficient_liquidity'] = 'Not enough LP tokens to remove';
      troubleshooting['approval_required'] = 'LP tokens need approval first - may have failed';
      troubleshooting['pool_not_exist'] = 'Verify liquidity pool exists for this token pair';
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
      recommendation: `For testnet liquidity removal, ensure: (1) DEX supports testnet, (2) Pool exists for token pair, (3) Sufficient LP tokens in wallet`,
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
