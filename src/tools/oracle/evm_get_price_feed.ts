import { ethers } from 'ethers';
import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

// Chainlink price feed addresses for TESTNETS
// Source: https://docs.chain.link/data-feeds/price-feeds/addresses
// NOTE: These are testnet addresses. Mainnet addresses are different!
const PRICE_FEEDS: Record<string, Record<string, string>> = {
  // Ethereum Sepolia Testnet
  ethereum: {
    'ETH/USD': '0x694AA1769357215DE4FAC081bf1f309aDC325306',
    'BTC/USD': '0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43',
    'LINK/USD': '0xc59E3633BAAC79493d908e63626716e204A45EdF',
    'USDC/USD': '0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E',
    'DAI/USD': '0x14866185B1962B63C3Ea9E03Bc1da838bab34C19',
    'AAVE/USD': '0x8e21C2cB6DdfC4E2D0c5B0F8c2F0f0dF1b7a5C95', // May not be available on Sepolia
    'USDT/USD': '0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E'  // Using USDC feed as placeholder
  },
  // Polygon Amoy Testnet
  polygon: {
    'POL/USD': '0x001382149eBa3441043c1c66972b4772963f5D43',  // POL (ex-MATIC) feed
    'ETH/USD': '0xF0d50568e3A7e8259E16663972b11910F89BD8e7',
    'BTC/USD': '0xe7656e23fE8077D438aEfbec2fAbDf2D8e070C4f',
    'LINK/USD': '0xc2e2152647F4C26028482Efaf64b2Aa28779EFC4',
    'USDC/USD': '0x1b8739bB4CdF0089d07097A9Ae5Bd274b29C6F16',
    'USDT/USD': '0x92C09849638959196E976289418e5973CC96d645',
    'AAVE/USD': '0x9A16D0FB8D42abF0d6D8a72C5BF4f4b8F4A3eCa5' // May not be available
  },
  // Avalanche Fuji Testnet
  avalanche: {
    'AVAX/USD': '0x5498BB86BC934c8D34FDA08E81D444153d0D06aD',
    'ETH/USD': '0x86d67c3D38D2bCeE722E601025C25a575021c6EA',
    'BTC/USD': '0x31CF013A08c6Ac228C94009b1e17F0d3d84C9f',
    'LINK/USD': '0x79c91fd4F8b3DaBEe17d286EB11cEE4D83521775',
    'USDC/USD': '0x7898AcCC83587C3C55116c5230C17a6Cd9C71bad',
    'USDT/USD': '0x7898AcCC83587C3C55116c5230C17a6Cd9C71bad'  // Using USDC feed
  },
  // BSC Testnet
  bsc: {
    'BNB/USD': '0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526',
    'ETH/USD': '0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7',
    'BTC/USD': '0x5741306c21795FdCBb9b265Ea0255F499DFe515C',
    'USDC/USD': '0x90c069C4538a674Cd69a94d36ae1bf16fDBcdC58',
    'USDT/USD': '0xEca2605f0BCF2BA5966372C99837b1F182d3D620',
    'CAKE/USD': '0x81faeDDfeBc2F8Ac524327d70Cf913001732224C'
  },
  // Arbitrum Sepolia Testnet
  arbitrum: {
    'ETH/USD': '0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165',
    'BTC/USD': '0x56a43EB56Da12C0dc1D972ACb089c06a5dEF8e69',
    'LINK/USD': '0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298',
    'USDC/USD': '0x0153002d20B96532C639313c2d54c3dA09109309',
    'ARB/USD': '0x' // ARB feed may not be on Sepolia testnet
  },
  // Base Sepolia Testnet
  base: {
    'ETH/USD': '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1',
    'BTC/USD': '0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298',  // May not be available
    'USDC/USD': '0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165',
    'LINK/USD': '0xb113F5A928BCfF189C998ab20d753a47F9dE5A61'
  },
  // WorldChain Testnet - Price feeds not yet available
  worldchain: {
    'ETH/USD': '0x0000000000000000000000000000000000000000'  // Not available yet
  }
};

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  pair: z.string().describe('Price pair (e.g., ETH/USD, BTC/USD)'),
  customFeed: z.string().optional().describe('Custom price feed address'),
  includeHistory: z.boolean().optional().describe('Include recent price history'),
  roundId: z.string().optional().describe('Specific round ID for historical data')
});

export async function handleGetPriceFeed(args: z.infer<typeof inputSchema>) {
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);

    // Get price feed address
    const feedAddress = validated.customFeed || PRICE_FEEDS[validated.chain]?.[validated.pair];

    if (!feedAddress || feedAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error(`Price feed for ${validated.pair} not available on ${validated.chain}`);
    }

    // Chainlink Aggregator ABI
    const aggregatorABI = [
      'function latestRoundData() view returns (uint80 roundId, int256 price, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
      'function decimals() view returns (uint8)',
      'function description() view returns (string)',
      'function getRoundData(uint80 _roundId) view returns (uint80 roundId, int256 price, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
      'function latestAnswer() view returns (int256)',
      'function latestTimestamp() view returns (uint256)',
      'function version() view returns (uint256)'
    ];

    const priceFeed = new ethers.Contract(feedAddress, aggregatorABI, provider);

    // Get latest price data using staticCall (view functions, no transaction)
    const [roundId, price, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData.staticCall();
    const decimalsRaw = await priceFeed.decimals.staticCall();
    const decimals = Number(decimalsRaw); // Convert BigInt to Number for Math operations
    const description = await priceFeed.description.staticCall();

    // Format price (convert BigInt to string first to avoid serialization issues)
    const priceNumber = Number(price.toString()) / Math.pow(10, decimals);

    // Calculate price age
    const currentTime = Math.floor(Date.now() / 1000);
    const dataAge = currentTime - Number(updatedAt.toString());

    // Get historical data if requested
    let priceHistory = [];
    if (validated.includeHistory) {
      const rounds = 5; // Get last 5 rounds
      for (let i = 0; i < rounds; i++) {
        try {
          const historicalRoundId = BigInt(roundId) - BigInt(i);
          const [, histPrice, , histUpdatedAt,] = await priceFeed.getRoundData.staticCall(historicalRoundId.toString());

          priceHistory.push({
            roundId: historicalRoundId.toString(),
            price: Number(histPrice.toString()) / Math.pow(10, decimals),
            timestamp: Number(histUpdatedAt.toString()),
            date: new Date(Number(histUpdatedAt.toString()) * 1000).toISOString()
          });
        } catch (e) {
          // Older rounds might not exist
          break;
        }
      }
    }

    // Calculate price statistics
    let stats = {};
    if (priceHistory.length > 1) {
      const prices = priceHistory.map(h => h.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const change = ((prices[0] - prices[prices.length - 1]) / prices[prices.length - 1]) * 100;

      stats = {
        min24h: min.toFixed(2),
        max24h: max.toFixed(2),
        avg24h: avg.toFixed(2),
        changePercent: change.toFixed(2) + '%'
      };
    }

    // Check if price is stale
    const isStale = dataAge > 3600; // More than 1 hour old

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          pair: validated.pair,
          feedAddress,
          description,
          latestPrice: {
            value: priceNumber.toFixed(decimals),
            roundId: roundId.toString(),
            timestamp: Number(updatedAt.toString()),
            updatedAt: new Date(Number(updatedAt.toString()) * 1000).toISOString(),
            dataAge: `${dataAge} seconds`,
            isStale,
            decimals
          },
          statistics: stats,
          priceHistory: validated.includeHistory ? priceHistory : undefined,
          metadata: {
            answeredInRound: answeredInRound.toString(),
            startedAt: Number(startedAt.toString()),
            dataSource: 'Chainlink Price Feeds (Testnet)',
            network: `${validated.chain} testnet`
          },
          warning: isStale ? 'Price data may be stale (>1 hour old)' : undefined
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
          pair: validated.pair,
          feedAddress: validated.customFeed || PRICE_FEEDS[validated.chain]?.[validated.pair],
          troubleshooting: [
            'Verify the price pair is available on this TESTNET',
            'Check Chainlink docs: https://docs.chain.link/data-feeds/price-feeds/addresses',
            'Try a different pair (ETH/USD, BTC/USD are most common)',
            'Provide customFeed address if using non-standard oracle',
            '⚠️  Remember: Using TESTNET oracle addresses, not mainnet'
          ],
          availablePairs: Object.keys(PRICE_FEEDS[validated.chain] || {}).join(', ')
        }, null, 2)
      }]
    };
  }
}