import { ethers } from 'ethers';
import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  tokenIn: z.string().describe('Input token address'),
  tokenOut: z.string().describe('Output token address'),
  dexes: z.array(z.string()).describe('DEX addresses to check (e.g., Uniswap, Sushiswap)'),
  amountIn: z.string().describe('Amount to simulate for arbitrage'),
  includeGasCosts: z.boolean().optional().default(true).describe('Include gas costs in profit calculation')
});

interface DexPrice {
  dex: string;
  pairAddress?: string;
  priceAtoB?: number;
  priceBtoA?: number;
  outputAmount?: string;
  reserves?: {
    token0: string;
    token1: string;
  };
  liquidity?: number;
  error?: string;
}

interface ArbitrageOpportunity {
  type: 'ARBITRAGE_OPPORTUNITY' | 'TRIANGULAR_ARBITRAGE_CHECK';
  buyFrom?: string;
  sellTo?: string;
  priceDifference?: string;
  inputAmount?: string;
  expectedOutput?: string;
  profit?: {
    gross: string;
    gasCosts: string;
    net: string;
    profitable: boolean;
  };
  executionPath?: string[];
  note?: string;
}

export async function handleCalculateArbitrage(args: z.infer<typeof inputSchema>) {
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);

    // Common DEX router ABI for getting quotes
    const routerABI = [
      'function getAmountsOut(uint amountIn, address[] memory path) view returns (uint[] memory amounts)',
      'function getAmountsIn(uint amountOut, address[] memory path) view returns (uint[] memory amounts)',
      'function factory() view returns (address)',
      'function WETH() view returns (address)'
    ];

    // Factory ABI to get pair addresses
    const factoryABI = [
      'function getPair(address tokenA, address tokenB) view returns (address)'
    ];

    // Pair ABI to get reserves
    const pairABI = [
      'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
      'function token0() view returns (address)',
      'function token1() view returns (address)'
    ];

    const arbitrageOpportunities: ArbitrageOpportunity[] = [];

    // Get token info
    const tokenContractA = new ethers.Contract(
      validated.tokenIn,
      ['function decimals() view returns (uint8)', 'function symbol() view returns (string)'],
      provider
    );
    const tokenContractB = new ethers.Contract(
      validated.tokenOut,
      ['function decimals() view returns (uint8)', 'function symbol() view returns (string)'],
      provider
    );

    const [decimalsARaw, symbolA, decimalsBRaw, symbolB] = await Promise.all([
      tokenContractA.decimals(),
      tokenContractA.symbol(),
      tokenContractB.decimals(),
      tokenContractB.symbol()
    ]);

    // Convert BigInt decimals to Number for parseUnits
    const decimalsA = Number(decimalsARaw);
    const decimalsB = Number(decimalsBRaw);

    const inputAmountWei = ethers.parseUnits(validated.amountIn, decimalsA);

    // Check prices on each DEX
    const dexPrices: DexPrice[] = [];

    for (const dexAddress of validated.dexes) {
      try {
        const router = new ethers.Contract(dexAddress, routerABI, provider);

        // Get amounts for A -> B swap
        const pathAB = [validated.tokenIn, validated.tokenOut];
        const amountsAB = await router.getAmountsOut(inputAmountWei, pathAB);
        const outputB = amountsAB[1];

        // Get amounts for B -> A swap (reverse)
        const pathBA = [validated.tokenOut, validated.tokenIn];
        const amountsBA = await router.getAmountsOut(outputB, pathBA);
        const outputA = amountsBA[1];

        // Calculate price
        const priceAB = Number(ethers.formatUnits(outputB, decimalsB)) / Number(validated.amountIn);
        const priceBA = Number(ethers.formatUnits(outputA, decimalsA)) / Number(ethers.formatUnits(outputB, decimalsB));

        // Get factory and pair info for more details
        const factoryAddress = await router.factory();
        const factory = new ethers.Contract(factoryAddress, factoryABI, provider);
        const pairAddress = await factory.getPair(validated.tokenIn, validated.tokenOut);

        let reserves = { reserve0: 0n, reserve1: 0n };
        if (pairAddress !== ethers.ZeroAddress) {
          const pair = new ethers.Contract(pairAddress, pairABI, provider);
          reserves = await pair.getReserves();
        }

        dexPrices.push({
          dex: dexAddress,
          pairAddress,
          priceAtoB: priceAB,
          priceBtoA: priceBA,
          outputAmount: ethers.formatUnits(outputB, decimalsB),
          reserves: {
            token0: reserves.reserve0.toString(),
            token1: reserves.reserve1.toString()
          },
          liquidity: Number(reserves.reserve0) + Number(reserves.reserve1)
        });

      } catch (e) {
        // DEX might not have this pair
        dexPrices.push({
          dex: dexAddress,
          error: 'Pair not available or insufficient liquidity'
        });
      }
    }

    // Find arbitrage opportunities
    const validPrices = dexPrices.filter(p => !p.error && p.priceAtoB !== undefined && p.priceBtoA !== undefined && p.outputAmount !== undefined);

    if (validPrices.length >= 2) {
      // Sort by price to find best buy/sell
      const sortedByPrice = [...validPrices].sort((a, b) => (a.priceAtoB || 0) - (b.priceAtoB || 0));
      const lowestPrice = sortedByPrice[0];
      const highestPrice = sortedByPrice[sortedByPrice.length - 1];

      if (lowestPrice.priceAtoB && highestPrice.priceAtoB && lowestPrice.outputAmount) {
        const priceDiff = highestPrice.priceAtoB - lowestPrice.priceAtoB;
        const priceDiffPercent = (priceDiff / lowestPrice.priceAtoB) * 100;

        if (priceDiffPercent > 0.1) { // More than 0.1% difference
          const buyAmount = ethers.parseUnits(validated.amountIn, decimalsA);
          const sellAmount = ethers.parseUnits(lowestPrice.outputAmount, decimalsB);

          // Calculate profit
          const buyValue = Number(validated.amountIn) * lowestPrice.priceAtoB;
          const sellValue = Number(lowestPrice.outputAmount) * (highestPrice.priceBtoA || 0);
          const grossProfit = sellValue - Number(validated.amountIn);

          // Estimate gas costs
          let netProfit = grossProfit;
          let gasCosts = 0;

          if (validated.includeGasCosts) {
            const gasPrice = await provider.getFeeData();
            const estimatedGas = 300000n; // Approximate for 2 swaps
            const gasCostWei = estimatedGas * (gasPrice.gasPrice || 0n);
            gasCosts = Number(ethers.formatEther(gasCostWei));
            netProfit = grossProfit - gasCosts;
          }

          arbitrageOpportunities.push({
            type: 'ARBITRAGE_OPPORTUNITY',
            buyFrom: lowestPrice.dex,
            sellTo: highestPrice.dex,
            priceDifference: priceDiffPercent.toFixed(2) + '%',
            inputAmount: validated.amountIn + ' ' + symbolA,
            expectedOutput: highestPrice.outputAmount + ' ' + symbolB,
            profit: {
              gross: grossProfit.toFixed(4) + ' ' + symbolA,
              gasCosts: gasCosts.toFixed(6) + ' ETH',
              net: netProfit.toFixed(4) + ' ' + symbolA,
              profitable: netProfit > 0
            },
            executionPath: [
              `1. Buy ${symbolB} on DEX1 with ${validated.amountIn} ${symbolA}`,
              `2. Sell ${lowestPrice.outputAmount} ${symbolB} on DEX2 for ${symbolA}`,
              `3. Net profit: ${netProfit.toFixed(4)} ${symbolA}`
            ]
          });
        }
      }
    }

    // Check for triangular arbitrage if we have 3+ DEXs
    if (validPrices.length >= 3) {
      // This would require checking A->B->C->A paths
      arbitrageOpportunities.push({
        type: 'TRIANGULAR_ARBITRAGE_CHECK',
        note: 'Complex triangular arbitrage analysis available with additional token parameter'
      });
    }

    // Calculate overall market efficiency
    const pricesAtoB = validPrices.map(p => p.priceAtoB).filter((p): p is number => p !== undefined);
    const priceVariance = pricesAtoB.length > 0 ? Math.max(...pricesAtoB) - Math.min(...pricesAtoB) : 0;
    const marketEfficiency = priceVariance < 0.01 ? 'High' : priceVariance < 0.1 ? 'Medium' : 'Low';

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          tokenPair: `${symbolA}/${symbolB}`,
          marketAnalysis: {
            dexCount: validated.dexes.length,
            validPairs: validPrices.length,
            priceRange: {
              min: pricesAtoB.length > 0 ? Math.min(...pricesAtoB) : 0,
              max: pricesAtoB.length > 0 ? Math.max(...pricesAtoB) : 0,
              spread: priceVariance
            },
            efficiency: marketEfficiency
          },
          dexPrices,
          arbitrageOpportunities,
          executionRequirements: [
            'Smart contract for atomic execution',
            'Flash loan for capital efficiency',
            'MEV protection to avoid front-running',
            'Gas optimization for profitability'
          ],
          risks: [
            'Slippage during execution',
            'Front-running by MEV bots',
            'Gas price spikes',
            'Smart contract bugs'
          ],
          note: 'This is a simplified calculation. Real arbitrage requires atomic execution and slippage consideration.'
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error.message,
          chain: validated.chain,
          suggestion: 'Ensure valid token addresses and DEX router addresses'
        }, null, 2)
      }]
    };
  }
}