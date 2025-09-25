import { ethers } from 'ethers';
import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  token0: z.object({
    symbol: z.string(),
    initialPrice: z.string().describe('Initial price when liquidity was added'),
    currentPrice: z.string().describe('Current price of token'),
    amount: z.string().describe('Amount of token0 in pool')
  }),
  token1: z.object({
    symbol: z.string(),
    initialPrice: z.string().describe('Initial price when liquidity was added'),
    currentPrice: z.string().describe('Current price of token'),
    amount: z.string().describe('Amount of token1 in pool')
  }),
  poolAddress: z.string().optional().describe('Pool address for live data'),
  includeFeesEarned: z.boolean().optional().describe('Include estimated fees in calculation'),
  feeRate: z.number().optional().describe('Pool fee rate (e.g., 0.3 for 0.3%)')
});

export async function handleGetImpermanentLoss(args: z.infer<typeof inputSchema>) {
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);

    // Parse prices and amounts
    const initialPrice0 = parseFloat(validated.token0.initialPrice);
    const currentPrice0 = parseFloat(validated.token0.currentPrice);
    const initialPrice1 = parseFloat(validated.token1.initialPrice);
    const currentPrice1 = parseFloat(validated.token1.currentPrice);
    const amount0 = parseFloat(validated.token0.amount);
    const amount1 = parseFloat(validated.token1.amount);

    // Calculate initial value
    const initialValue = (amount0 * initialPrice0) + (amount1 * initialPrice1);

    // Calculate price ratio changes
    const initialRatio = initialPrice0 / initialPrice1;
    const currentRatio = currentPrice0 / currentPrice1;
    const priceRatioChange = currentRatio / initialRatio;

    // Calculate impermanent loss percentage
    // IL% = 2 * sqrt(price_ratio) / (1 + price_ratio) - 1
    const sqrtPriceRatio = Math.sqrt(priceRatioChange);
    const impermanentLossPercent = (2 * sqrtPriceRatio / (1 + priceRatioChange) - 1) * 100;

    // Calculate current pool value (with IL)
    const k = amount0 * amount1; // Constant product
    const newAmount0 = Math.sqrt(k / currentRatio);
    const newAmount1 = Math.sqrt(k * currentRatio);
    const poolValueWithIL = (newAmount0 * currentPrice0) + (newAmount1 * currentPrice1);

    // Calculate HODL value (if just held tokens)
    const hodlValue = (amount0 * currentPrice0) + (amount1 * currentPrice1);

    // Calculate actual IL in USD
    const impermanentLossUSD = hodlValue - poolValueWithIL;

    // Calculate percentage changes
    const token0PriceChange = ((currentPrice0 - initialPrice0) / initialPrice0) * 100;
    const token1PriceChange = ((currentPrice1 - initialPrice1) / initialPrice1) * 100;

    // Fee calculation (if requested)
    let estimatedFees = 0;
    let netPosition = impermanentLossUSD;

    if (validated.includeFeesEarned && validated.feeRate) {
      // Rough estimation: assume average volume is 2x liquidity per day
      const estimatedDailyVolume = poolValueWithIL * 2;
      const dailyFees = estimatedDailyVolume * (validated.feeRate / 100);
      const daysInPool = 30; // Assume 30 days for estimation
      estimatedFees = dailyFees * daysInPool;
      netPosition = estimatedFees - Math.abs(impermanentLossUSD);
    }

    // If pool address provided, fetch live data
    let livePoolData = null;
    if (validated.poolAddress) {
      try {
        // UniswapV2 pair ABI for getting reserves
        const pairABI = [
          'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
          'function token0() view returns (address)',
          'function token1() view returns (address)',
          'function totalSupply() view returns (uint256)'
        ];

        const pairContract = new ethers.Contract(validated.poolAddress, pairABI, provider);
        const [reserve0, reserve1] = await pairContract.getReserves();
        const totalSupply = await pairContract.totalSupply();

        livePoolData = {
          reserve0: ethers.formatEther(reserve0),
          reserve1: ethers.formatEther(reserve1),
          totalSupply: ethers.formatEther(totalSupply),
          currentRatio: parseFloat(ethers.formatEther(reserve0)) / parseFloat(ethers.formatEther(reserve1))
        };
      } catch (e) {
        // Pool data fetch failed, continue without it
      }
    }

    // Risk assessment
    let riskLevel = 'Low';
    let riskExplanation = '';

    if (Math.abs(impermanentLossPercent) > 10) {
      riskLevel = 'High';
      riskExplanation = 'Significant price divergence causing high IL';
    } else if (Math.abs(impermanentLossPercent) > 5) {
      riskLevel = 'Medium';
      riskExplanation = 'Moderate price divergence';
    } else {
      riskExplanation = 'Prices relatively stable';
    }

    // Recommendations
    const recommendations = [];
    if (impermanentLossPercent < -5) {
      recommendations.push('Consider removing liquidity if you expect further divergence');
    }
    if (netPosition > 0 && validated.includeFeesEarned) {
      recommendations.push('Fees are currently offsetting IL - monitor regularly');
    }
    if (Math.abs(token0PriceChange) > 50 || Math.abs(token1PriceChange) > 50) {
      recommendations.push('Large price movements detected - consider rebalancing');
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          pair: `${validated.token0.symbol}/${validated.token1.symbol}`,
          impermanentLoss: {
            percentage: `${impermanentLossPercent.toFixed(2)}%`,
            usdValue: `$${Math.abs(impermanentLossUSD).toFixed(2)}`,
            direction: impermanentLossUSD < 0 ? 'Loss' : 'Gain'
          },
          values: {
            initial: `$${initialValue.toFixed(2)}`,
            hodl: `$${hodlValue.toFixed(2)}`,
            currentPool: `$${poolValueWithIL.toFixed(2)}`
          },
          priceChanges: {
            [validated.token0.symbol]: `${token0PriceChange.toFixed(2)}%`,
            [validated.token1.symbol]: `${token1PriceChange.toFixed(2)}%`,
            ratioChange: `${((priceRatioChange - 1) * 100).toFixed(2)}%`
          },
          poolComposition: {
            initial: {
              [validated.token0.symbol]: amount0.toFixed(4),
              [validated.token1.symbol]: amount1.toFixed(4)
            },
            current: {
              [validated.token0.symbol]: newAmount0.toFixed(4),
              [validated.token1.symbol]: newAmount1.toFixed(4)
            }
          },
          fees: validated.includeFeesEarned ? {
            estimated: `$${estimatedFees.toFixed(2)}`,
            netPosition: `$${netPosition.toFixed(2)}`,
            profitable: netPosition > 0
          } : null,
          livePoolData,
          risk: {
            level: riskLevel,
            explanation: riskExplanation
          },
          recommendations
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
          suggestion: 'Ensure price and amount values are correct'
        }, null, 2)
      }]
    };
  }
}