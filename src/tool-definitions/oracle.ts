import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { OS_GUIDANCE, CHAIN_GUIDANCE, SUPPORTED_CHAINS } from '../constants/guidance.js';

export const ORACLE_TOOLS: Tool[] = [
    {
        name: 'evm_get_price_feed',
        description: `
Get real-time price data from Chainlink oracles

Fetch accurate price feeds for tokens and trading pairs.
Includes price history and staleness checks.

AVAILABLE FEEDS:
- Major pairs: ETH/USD, BTC/USD, LINK/USD
- Stablecoins: USDC/USD, DAI/USD, USDT/USD
- DeFi tokens: AAVE/USD, UNI/USD, CAKE/USD
- Native tokens: POL/USD, AVAX/USD, BNB/USD

PARAMETERS:
- chain: Target blockchain
- pair: Price pair (e.g., ETH/USD)
- customFeed: Custom price feed address (optional)
- includeHistory: Include recent price history
- roundId: Specific round for historical data (optional)

Returns latest price, statistics, history, and data freshness.
`,
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                pair: { type: 'string' },
                customFeed: { type: 'string' },
                includeHistory: { type: 'boolean' },
                roundId: { type: 'string' }
            },
            required: ['chain', 'pair']
        }
    }
];
