/**
 * Get liquidity pool information
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

// Uniswap V2 Pair ABI (minimal)
const PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function totalSupply() external view returns (uint256)'
];

// Uniswap V2 Factory ABI (minimal)
const FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)'
];

// ERC20 ABI for fetching token decimals (HIGH priority bug fix)
const ERC20_ABI = [
  'function decimals() external view returns (uint8)'
];

export async function handleGetPoolInfo(args: {
  chain: string;
  dex: string;
  tokenA: string;
  tokenB: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    const config = clientManager.getChainConfig(args.chain);
    const provider = clientManager.getProvider(args.chain);
    const tokenAAddress = clientManager.getChecksumAddress(args.tokenA);
    const tokenBAddress = clientManager.getChecksumAddress(args.tokenB);

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

    const factoryAddress = dexFactories[args.chain]?.[args.dex.toLowerCase()];
    if (!factoryAddress) {
      throw new Error(`DEX ${args.dex} not supported on ${args.chain}`);
    }

    if (factoryAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error(`DEX ${args.dex} factory not configured for ${args.chain}. This is a placeholder address.`);
    }

    // Check if factory contract exists
    const factoryCode = await provider.getCode(factoryAddress);
    if (factoryCode === '0x') {
      throw new Error(`DEX factory contract not deployed at ${factoryAddress} on ${args.chain}. This may be a mainnet-only DEX or incorrect factory address for testnet.`);
    }

    const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);
    const pairAddress = await factory.getPair(tokenAAddress, tokenBAddress);

    if (pairAddress === ethers.ZeroAddress) {
      throw new Error('Liquidity pool does not exist for this token pair');
    }

    const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
    const [reserves, token0, token1, totalSupply] = await Promise.all([
      pair.getReserves(),
      pair.token0(),
      pair.token1(),
      pair.totalSupply()
    ]);

    // Fetch token decimals for proper formatting (HIGH priority bug fix)
    const token0Contract = new ethers.Contract(token0, ERC20_ABI, provider);
    const token1Contract = new ethers.Contract(token1, ERC20_ABI, provider);

    const [decimals0, decimals1] = await Promise.all([
      token0Contract.decimals(),
      token1Contract.decimals()
    ]);

    // LP tokens typically have 18 decimals (standard for Uniswap V2)
    const lpDecimals = 18;

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      pool: {
        dex: args.dex,
        pairAddress,
        token0: token0,
        token1: token1,
        reserve0: ethers.formatUnits(reserves[0], decimals0),
        reserve1: ethers.formatUnits(reserves[1], decimals1),
        totalSupply: ethers.formatUnits(totalSupply, lpDecimals),
        lastUpdate: new Date(reserves[2] * 1000).toISOString()
      },
      explorer: clientManager.getExplorerUrl(args.chain, pairAddress),
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
      specificError = 'Factory contract returned empty data (0x). This usually means the factory contract is not deployed or the DEX is not available on this network.';
      troubleshooting['mainnet_only_dex'] = `${args.dex} may only be available on mainnet, not ${args.chain} testnet`;
      troubleshooting['factory_not_deployed'] = 'Factory contract may not be deployed at the configured address on testnet';
      troubleshooting['check_factory'] = `Verify factory exists at configured address for ${args.dex}`;
    } else if (error.message.includes('factory not configured')) {
      troubleshooting['configuration_needed'] = 'This DEX needs a proper factory address configured for the testnet';
    } else if (error.message.includes('factory contract not deployed')) {
      troubleshooting['testnet_unavailable'] = `${args.dex} appears to be mainnet-only. Check if there's a testnet deployment`;
      troubleshooting['use_alternative'] = 'Try a different DEX that supports this testnet';
    } else if (error.message.includes('Liquidity pool does not exist')) {
      troubleshooting['pool_not_created'] = 'No liquidity pool has been created for this token pair';
      troubleshooting['create_pool'] = 'You may need to create the pool first using add_liquidity';
    } else {
      troubleshooting['pool_does_not_exist'] = 'Liquidity pool not created for this pair';
      troubleshooting['reverted'] = 'Check token addresses are valid on this network';
      troubleshooting['verify_tokens'] = 'Ensure both tokens are deployed and have correct addresses';
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
      recommendation: `For testnet DEX pools, ensure: (1) DEX supports testnet, (2) Factory contract is deployed, (3) Pool has been created for this pair`,
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
