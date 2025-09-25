/**
 * Display comprehensive help and usage information
 */

import { getClientManager } from '../../client-manager.js';
import { CORE_TOOLS } from '../../tool-definitions/core.js';
import { WALLET_TOOLS } from '../../tool-definitions/wallet.js';
import { TOKENS_TOOLS } from '../../tool-definitions/tokens.js';
import { CONTRACTS_TOOLS } from '../../tool-definitions/contracts.js';
import { DEFI_TOOLS } from '../../tool-definitions/defi.js';
import { NFT_TOOLS } from '../../tool-definitions/nft.js';
import { NETWORK_GAS_TOOLS } from '../../tool-definitions/network-gas.js';
import { HELP_TOOLS } from '../../tool-definitions/help.js';
import { ANALYTICS_TOOLS } from '../../tool-definitions/analytics.js';
import { STAKING_TOOLS } from '../../tool-definitions/staking.js';
import { MEV_TOOLS } from '../../tool-definitions/mev.js';
import { FLASH_LOAN_TOOLS } from '../../tool-definitions/flash-loan.js';
import { ADVANCED_DEFI_TOOLS } from '../../tool-definitions/advanced-defi.js';
import { YIELD_FARMING_TOOLS } from '../../tool-definitions/yield-farming.js';
import { MEV_ANALYSIS_TOOLS } from '../../tool-definitions/mev-analysis.js';
import { MEMPOOL_TOOLS } from '../../tool-definitions/mempool.js';
import { BRIDGE_TOOLS } from '../../tool-definitions/bridge.js';
import { GOVERNANCE_TOOLS } from '../../tool-definitions/governance.js';
import { EVENT_TOOLS } from '../../tool-definitions/events.js';
import { LENDING_TOOLS } from '../../tool-definitions/lending.js';
import { ORACLE_TOOLS } from '../../tool-definitions/oracle.js';
import { BATCH_TOOLS } from '../../tool-definitions/batch.js';
import { TOKEN_FACTORY_TOOLS } from '../../tool-definitions/token-factory.js';
import { GASLESS_TOOLS } from '../../tool-definitions/gasless.js';
import { ENS_TOOLS } from '../../tool-definitions/ens.js';
import { TOKEN_STREAMING_TOOLS } from '../../tool-definitions/streaming.js';

const ALL_TOOLS = [
    ...CORE_TOOLS,
    ...WALLET_TOOLS,
    ...TOKENS_TOOLS,
    ...CONTRACTS_TOOLS,
    ...DEFI_TOOLS,
    ...NFT_TOOLS,
    ...NETWORK_GAS_TOOLS,
    ...HELP_TOOLS,
    ...ANALYTICS_TOOLS,
    ...STAKING_TOOLS,
    ...MEV_TOOLS,
    ...FLASH_LOAN_TOOLS,
    ...ADVANCED_DEFI_TOOLS,
    ...YIELD_FARMING_TOOLS,
    ...MEV_ANALYSIS_TOOLS,
    ...MEMPOOL_TOOLS,
    ...BRIDGE_TOOLS,
    ...GOVERNANCE_TOOLS,
    ...EVENT_TOOLS,
    ...LENDING_TOOLS,
    ...ORACLE_TOOLS,
    ...BATCH_TOOLS,
    ...TOKEN_FACTORY_TOOLS,
    ...GASLESS_TOOLS,
    ...ENS_TOOLS,
    ...TOKEN_STREAMING_TOOLS,
];


interface Tool { name: string; description?: string; }

export async function handleHelp(args: {
  topic?: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    const supportedChains = clientManager.getSupportedChains();

  const helpData: any = {
    success: true,
    server: 'EVM Chains MCP Server',
    version: '1.0.0',
    description: 'Multi-chain EVM blockchain operations server supporting 7 testnets',
    supportedChains: supportedChains,
    totalTools: ALL_TOOLS.length, // Dynamically set total tools
    categories: {
        core: {
            count: CORE_TOOLS.length,
            description: 'Essential blockchain operations',
            tools: CORE_TOOLS.map((t: Tool) => `${t.name} - ${(t.description || '').split('\n')[0]}`)
        },
        wallet: {
            count: WALLET_TOOLS.length,
            description: 'Wallet management operations',
            tools: WALLET_TOOLS.map((t: Tool) => `${t.name} - ${(t.description || '').split('\n')[0]}`)
        },
        tokens: {
            count: TOKENS_TOOLS.length,
            description: 'ERC-20 token operations',
            tools: TOKENS_TOOLS.map((t: Tool) => `${t.name} - ${(t.description || '').split('\n')[0]}`)
        },
        contracts: {
            count: CONTRACTS_TOOLS.length,
            description: 'Smart contract interactions',
            tools: CONTRACTS_TOOLS.map((t: Tool) => `${t.name} - ${(t.description || '').split('\n')[0]}`)
        },
        defi: {
            count: DEFI_TOOLS.length + FLASH_LOAN_TOOLS.length + YIELD_FARMING_TOOLS.length + ADVANCED_DEFI_TOOLS.length,
            description: 'DeFi protocol operations (DEX, liquidity, staking, lending, flash loans)',
            tools: [
                ...DEFI_TOOLS.map((t: Tool) => `${t.name} - ${(t.description || '').split('\n')[0]}`),
                ...FLASH_LOAN_TOOLS.map((t: Tool) => `${t.name} - ${(t.description || '').split('\n')[0]}`),
                ...YIELD_FARMING_TOOLS.map((t: Tool) => `${t.name} - ${(t.description || '').split('\n')[0]}`),
                ...ADVANCED_DEFI_TOOLS.map((t: Tool) => `${t.name} - ${(t.description || '').split('\n')[0]}`),
            ]
        },
        nft: {
            count: NFT_TOOLS.length,
            description: 'NFT (ERC-721/ERC-1155) operations with IPFS support',
            tools: NFT_TOOLS.map((t: Tool) => `${t.name} - ${(t.description || '').split('\n')[0]}`)
        },
        network: {
            count: NETWORK_GAS_TOOLS.length + MEMPOOL_TOOLS.length + ENS_TOOLS.length,
            description: 'Network status, gas operations, and fee analytics',
            tools: [
                ...NETWORK_GAS_TOOLS.map((t: Tool) => `${t.name} - ${(t.description || '').split('\n')[0]}`),
                ...MEMPOOL_TOOLS.map((t: Tool) => `${t.name} - ${(t.description || '').split('\n')[0]}`),
                ...ENS_TOOLS.map((t: Tool) => `${t.name} - ${(t.description || '').split('\n')[0]}`),
            ]
        },
        analytics: {
            count: ANALYTICS_TOOLS.length + MEV_ANALYSIS_TOOLS.length,
            description: 'Account analytics and portfolio tracking',
            tools: [
                ...ANALYTICS_TOOLS.map((t: Tool) => `${t.name} - ${(t.description || '').split('\n')[0]}`),
                ...MEV_ANALYSIS_TOOLS.map((t: Tool) => `${t.name} - ${(t.description || '').split('\n')[0]}`),
            ]
        },
        help: {
            count: HELP_TOOLS.length,
            description: 'Help and tool discovery',
            tools: HELP_TOOLS.map((t: Tool) => `${t.name} - ${(t.description || '').split('\n')[0]}`)
        },
        staking: {
            count: STAKING_TOOLS.length,
            description: 'Staking protocol operations',
            tools: STAKING_TOOLS.map((t: Tool) => `${t.name} - ${(t.description || '').split('\n')[0]}`)
        },
        mev: {
            count: MEV_TOOLS.length,
            description: 'MEV protection and analysis tools',
            tools: MEV_TOOLS.map((t: Tool) => `${t.name} - ${(t.description || '').split('\n')[0]}`)
        },
        bridge: {
            count: BRIDGE_TOOLS.length,
            description: 'Cross-chain bridge operations',
            tools: BRIDGE_TOOLS.map((t: Tool) => `${t.name} - ${(t.description || '').split('\n')[0]}`)
        },
        governance: {
            count: GOVERNANCE_TOOLS.length,
            description: 'DAO governance operations',
            tools: GOVERNANCE_TOOLS.map((t: Tool) => `${t.name} - ${(t.description || '').split('\n')[0]}`)
        },
        events: {
            count: EVENT_TOOLS.length,
            description: 'Blockchain event filtering and monitoring',
            tools: EVENT_TOOLS.map((t: Tool) => `${t.name} - ${(t.description || '').split('\n')[0]}`)
        },
        lending: {
            count: LENDING_TOOLS.length,
            description: 'Lending protocol interactions',
            tools: LENDING_TOOLS.map((t: Tool) => `${t.name} - ${(t.description || '').split('\n')[0]}`)
        },
        oracle: {
            count: ORACLE_TOOLS.length,
            description: 'Decentralized oracle data retrieval',
            tools: ORACLE_TOOLS.map((t: Tool) => `${t.name} - ${(t.description || '').split('\n')[0]}`)
        },
        batch: {
            count: BATCH_TOOLS.length,
            description: 'Batch transaction operations',
            tools: BATCH_TOOLS.map((t: Tool) => `${t.name} - ${(t.description || '').split('\n')[0]}`)
        },
        factory: {
            count: TOKEN_FACTORY_TOOLS.length,
            description: 'Token factory operations',
            tools: TOKEN_FACTORY_TOOLS.map((t: Tool) => `${t.name} - ${(t.description || '').split('\n')[0]}`)
        },
        gasless: {
            count: GASLESS_TOOLS.length,
            description: 'Gasless transaction mechanisms',
            tools: GASLESS_TOOLS.map((t: Tool) => `${t.name} - ${(t.description || '').split('\n')[0]}`)
        },
        streaming: {
            count: TOKEN_STREAMING_TOOLS.length,
            description: 'Token streaming operations',
            tools: TOKEN_STREAMING_TOOLS.map((t: Tool) => `${t.name} - ${(t.description || '').split('\n')[0]}`)
        },
    },
    usage: {
      chainParameter: `Most tools require a "chain" parameter. Supported values: ${supportedChains.join(', ')}`,
      examples: [
        {
          tool: 'evm_get_balance',
          description: 'Get ETH balance on Ethereum Sepolia',
          args: { chain: 'ethereum', address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' },
        },
      ],
    },
    resources: {
        documentation: 'https://github.com/your-org/evm-chains-mcp-server',
        explorers: supportedChains.reduce((acc: any, chain: string) => {
          const config = clientManager.getChainConfig(chain);
          acc[chain] = config.explorer;
          return acc;
        }, {}),
      },
    executionTime: `${Date.now() - startTime}ms`,
  };

  // Topic filtering logic remains the same
  if (args.topic) {
    const topic = args.topic.toLowerCase();
    if (helpData.categories[topic]) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, category: topic, ...helpData.categories[topic] }, null, 2) }] };
    } else {
      return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: `Topic '${args.topic}' not found`, availableTopics: Object.keys(helpData.categories) }, null, 2) }] };
    }
  }

  return { content: [{ type: 'text', text: JSON.stringify(helpData, null, 2) }] };
} catch (error: any) {
    const errorResponse = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      executionTime: `${Date.now() - startTime}ms`
    };

    return { content: [{ type: 'text', text: JSON.stringify(errorResponse, null, 2) }] };
  }
}
