/**
 * Search for tools by keyword in name or description
 *
 * Implementation note: build the searchable catalog dynamically from
 * the category tool-definition arrays to avoid drift with the registry.
 */

// Import categories to construct a dynamic catalog
import { CORE_TOOLS } from '../../tool-definitions/core.js';
import { WALLET_TOOLS } from '../../tool-definitions/wallet.js';
import { TOKENS_TOOLS } from '../../tool-definitions/tokens.js';
import { CONTRACTS_TOOLS } from '../../tool-definitions/contracts.js';
import { DEFI_TOOLS } from '../../tool-definitions/defi.js';
import { NFT_TOOLS } from '../../tool-definitions/nft.js';
import { NETWORK_GAS_TOOLS } from '../../tool-definitions/network-gas.js';
import { HELP_TOOLS } from '../../tool-definitions/help.js';
import { ANALYTICS_TOOLS } from '../../tool-definitions/analytics.js';
import { MEV_ANALYSIS_TOOLS } from '../../tool-definitions/mev-analysis.js';
import { MEV_TOOLS } from '../../tool-definitions/mev.js';
import { GASLESS_TOOLS } from '../../tool-definitions/gasless.js';
import { ADVANCED_DEFI_TOOLS } from '../../tool-definitions/advanced-defi.js';
import { TOKEN_STREAMING_TOOLS } from '../../tool-definitions/streaming.js';
import { TOKEN_FACTORY_TOOLS } from '../../tool-definitions/token-factory.js';
import { STAKING_TOOLS } from '../../tool-definitions/staking.js';
import { LENDING_TOOLS } from '../../tool-definitions/lending.js';
import { ENS_TOOLS } from '../../tool-definitions/ens.js';
import { JSON_RPC_TOOLS } from '../../tool-definitions/json-rpc.js';
import { BATCH_TOOLS } from '../../tool-definitions/batch.js';
import { ERC20_VIEWS_TOOLS } from '../../tool-definitions/erc20-views.js';
import { BRIDGE_TOOLS } from '../../tool-definitions/bridge.js';
import { YIELD_FARMING_TOOLS } from '../../tool-definitions/yield-farming.js';
import { GOVERNANCE_TOOLS } from '../../tool-definitions/governance.js';
import { LOGS_TOOLS } from '../../tool-definitions/logs.js';
import { MEMPOOL_TOOLS } from '../../tool-definitions/mempool.js';
import { ORACLE_TOOLS } from '../../tool-definitions/oracle.js';

// Import dynamically to check which tools are actually registered
async function getAvailableTools() {
  try {
    const { TOOL_HANDLERS } = await import('../../tool-handlers.js');
    return new Set(Object.keys(TOOL_HANDLERS));
  } catch {
    return new Set();
  }
}

export async function handleSearchTools(args: {
  query: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();

  try {
    const availableTools = await getAvailableTools();
    const query = args.query.toLowerCase();

    // Build catalog from category arrays with category labels
    const catalogGroups = [
      ['core', CORE_TOOLS],
      ['wallet', WALLET_TOOLS],
      ['tokens', TOKENS_TOOLS],
      ['contracts', CONTRACTS_TOOLS],
      ['defi', DEFI_TOOLS],
      ['nft', NFT_TOOLS],
      ['network', NETWORK_GAS_TOOLS],
      ['help', HELP_TOOLS],
      ['analytics', ANALYTICS_TOOLS],
      ['mev-analysis', MEV_ANALYSIS_TOOLS],
      ['mev', MEV_TOOLS],
      ['gasless', GASLESS_TOOLS],
      ['advanced-defi', ADVANCED_DEFI_TOOLS],
      ['streaming', TOKEN_STREAMING_TOOLS],
      ['token-factory', TOKEN_FACTORY_TOOLS],
      ['staking', STAKING_TOOLS],
      ['lending', LENDING_TOOLS],
      ['ens', ENS_TOOLS],
      ['json-rpc', JSON_RPC_TOOLS],
      ['batch', BATCH_TOOLS],
      ['erc20-views', ERC20_VIEWS_TOOLS],
      ['bridge', BRIDGE_TOOLS],
      ['yield-farming', YIELD_FARMING_TOOLS],
      ['governance', GOVERNANCE_TOOLS],
      ['logs', LOGS_TOOLS],
      ['mempool', MEMPOOL_TOOLS],
      ['oracle', ORACLE_TOOLS]
    ] as const;

    const allTools = catalogGroups.flatMap(([category, tools]) =>
      tools.map(t => ({
        name: t.name,
        category,
        description: (t.description || '').toString()
      }))
    );

    // Keep only tools that are actually registered (defensive)
    const registered = allTools.filter(t => availableTools.has(t.name));

    // Search in name, description, category (case-insensitive)
    const results = registered.filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query) ||
      t.category.toLowerCase().includes(query)
    );

    const response = {
      success: true,
      query: args.query,
      resultsCount: results.length,
      results: results.map(t => ({
        name: t.name,
        category: t.category,
        description: t.description.split('\n')[0] // first line summary
      })),
      executionTime: `${Date.now() - startTime}ms`
    };

    return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] };
  } catch (error: any) {
    const errorResponse = {
      success: false,
      error: error.message,
      query: args.query,
      timestamp: new Date().toISOString(),
      executionTime: `${Date.now() - startTime}ms`
    };
    return { content: [{ type: 'text', text: JSON.stringify(errorResponse, null, 2) }] };
  }
}
