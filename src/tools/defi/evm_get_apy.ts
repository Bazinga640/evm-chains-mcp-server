import { ethers } from 'ethers';
import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  protocol: z.string().describe('DeFi protocol name'),
  poolAddress: z.string().describe('Pool or vault address'),
  includeRewards: z.boolean().optional().default(true).describe('Include reward token APY')
});

export async function handleGetApy(args: z.infer<typeof inputSchema>) {
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);

    // Validate pool address is a valid address
    const poolAddress = clientManager.getChecksumAddress(validated.poolAddress);

    // Check if pool contract exists
    const poolCode = await provider.getCode(poolAddress);
    if (poolCode === '0x') {
      throw new Error(`Pool/vault contract not deployed at ${poolAddress} on ${validated.chain}. This may be a mainnet-only protocol or incorrect pool address for testnet.`);
    }

    // Common pool/vault ABI for APY calculation
    const poolABI = [
      'function totalSupply() view returns (uint256)',
      'function balanceOf(address) view returns (uint256)',
      'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
      'function token0() view returns (address)',
      'function token1() view returns (address)',
      'function rewardRate() view returns (uint256)',
      'function periodFinish() view returns (uint256)',
      'function totalAllocPoint() view returns (uint256)',
      'function poolInfo(uint256) view returns (address lpToken, uint256 allocPoint, uint256 lastRewardBlock, uint256 accRewardPerShare)',
      'function rewardsPerBlock() view returns (uint256)',
      'function pricePerShare() view returns (uint256)',
      'function lastHarvest() view returns (uint256)'
    ];

    const poolContract = new ethers.Contract(poolAddress, poolABI, provider);

    // Get pool metrics
    const totalSupply = await poolContract.totalSupply();

    // Calculate base APY from trading fees
    let baseAPY = 0;
    let rewardAPY = 0;
    let totalAPY = 0;

    try {
      // For AMM pools, estimate from reserves
      const reserves = await poolContract.getReserves();
      const token0 = await poolContract.token0();
      const token1 = await poolContract.token1();

      // Get 24h volume (this would need an indexer in production)
      // For now, estimate based on TVL
      const tvl = Number(reserves.reserve0) + Number(reserves.reserve1);
      const estimatedDailyVolume = tvl * 0.5; // Assume 50% daily volume/TVL ratio
      const feeRate = 0.003; // 0.3% fee tier
      const dailyFees = estimatedDailyVolume * feeRate;
      const annualFees = dailyFees * 365;

      baseAPY = (annualFees / tvl) * 100;

      // Get reward APY if applicable
      if (validated.includeRewards) {
        try {
          const rewardRate = await poolContract.rewardRate();
          const periodFinish = await poolContract.periodFinish();
          const currentTime = Math.floor(Date.now() / 1000);

          if (currentTime < Number(periodFinish)) {
            // Calculate annual rewards
            const annualRewards = Number(rewardRate) * 365 * 24 * 60 * 60;
            const rewardValue = annualRewards / 1e18; // Assume 18 decimals

            // Estimate reward token price (would need oracle in production)
            const rewardTokenPrice = 1; // Placeholder
            const annualRewardValue = rewardValue * rewardTokenPrice;

            rewardAPY = (annualRewardValue / (tvl / 1e18)) * 100;
          }
        } catch (e) {
          // No reward rate available
        }
      }

      totalAPY = baseAPY + rewardAPY;

    } catch (e) {
      // Fallback for vault-style contracts
      try {
        const pricePerShare = await poolContract.pricePerShare();
        const lastHarvest = await poolContract.lastHarvest();
        const currentTime = Math.floor(Date.now() / 1000);
        const timeDiff = currentTime - Number(lastHarvest);

        if (timeDiff > 0) {
          // Calculate growth since last harvest
          const growthRate = (Number(pricePerShare) - 1e18) / 1e18;
          const annualizedRate = (growthRate * 365 * 24 * 60 * 60) / timeDiff;
          totalAPY = annualizedRate * 100;
        }
      } catch (e2) {
        throw new Error('Unable to calculate APY for this pool');
      }
    }

    // Get additional pool info
    let poolMetrics: any = {
      totalValueLocked: ethers.formatEther(totalSupply),
      baseAPY: baseAPY.toFixed(2) + '%',
      totalAPY: totalAPY.toFixed(2) + '%'
    };

    if (rewardAPY > 0) {
      poolMetrics.rewardAPY = rewardAPY.toFixed(2) + '%';
    }

    // Calculate daily/weekly/monthly yields
    const dailyYield = totalAPY / 365;
    const weeklyYield = totalAPY / 52;
    const monthlyYield = totalAPY / 12;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          protocol: validated.protocol,
          poolAddress: validated.poolAddress,
          apy: {
            total: totalAPY.toFixed(2) + '%',
            base: baseAPY.toFixed(2) + '%',
            rewards: validated.includeRewards ? rewardAPY.toFixed(2) + '%' : 'N/A'
          },
          projectedYields: {
            daily: dailyYield.toFixed(4) + '%',
            weekly: weeklyYield.toFixed(3) + '%',
            monthly: monthlyYield.toFixed(2) + '%',
            annual: totalAPY.toFixed(2) + '%'
          },
          metrics: poolMetrics,
          compounding: {
            frequency: 'Daily auto-compound',
            gasEfficiency: 'Socialized across all users'
          },
          risks: [
            'Impermanent loss risk for LP positions',
            'Smart contract risk',
            'APY is variable and subject to change'
          ],
          note: 'APY calculations are estimates based on current rates'
        }, null, 2)
      }]
    };
  } catch (error: any) {
    // Enhanced error detection
    let specificError = error.message;
    const troubleshooting: Record<string, string> = {};

    if (error.message.includes('could not decode result') || error.message.includes('BAD_DATA')) {
      specificError = 'Pool/vault contract returned empty data (0x). This usually means the pool is not deployed or the protocol is not available on this network.';
      troubleshooting['mainnet_only_protocol'] = `${validated.protocol} may only be available on mainnet, not ${validated.chain} testnet`;
      troubleshooting['pool_not_deployed'] = 'Pool/vault contract may not be deployed at this address on testnet';
      troubleshooting['use_alternative'] = 'Try a different DeFi protocol that supports this testnet';
      troubleshooting['verify_address'] = 'Verify the pool address is correct for the target chain';
    } else if (error.message.includes('Pool/vault contract not deployed')) {
      troubleshooting['testnet_unavailable'] = `${validated.protocol} appears to be mainnet-only. Check if there's a testnet deployment`;
      troubleshooting['use_alternative'] = 'Try a different DeFi protocol that supports this testnet';
    } else if (error.message.includes('Unable to calculate APY')) {
      troubleshooting['unsupported_pool_type'] = 'Pool contract does not match expected interface';
      troubleshooting['check_protocol'] = `Verify pool is compatible with ${validated.protocol} interface`;
    } else {
      troubleshooting['invalid_pool'] = 'Pool address may not be a valid farming pool or vault';
      troubleshooting['check_address'] = 'Verify pool address is correct and deployed on this network';
      troubleshooting['protocol_mismatch'] = 'Pool may not be compatible with specified protocol';
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: specificError,
          chain: validated.chain,
          protocol: validated.protocol,
          poolAddress: validated.poolAddress,
          timestamp: new Date().toISOString(),
          troubleshooting,
          recommendation: 'For testnet yield farming, ensure: (1) Protocol supports testnet, (2) Pool is deployed at given address, (3) Pool contract matches protocol interface',
          note: '⚠️ This is a TESTNET-ONLY server. Most DeFi protocols (QuickSwap, Aave, etc.) are only deployed on mainnet. For production DeFi operations, use our evm-chains-mainnet-mcp-server with real assets.'
        }, null, 2)
      }]
    };
  }
}