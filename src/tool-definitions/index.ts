import { Tool } from '@modelcontextprotocol/sdk/types.js';

// Core category imports
import { CORE_TOOLS } from './core.js';
import { WALLET_TOOLS } from './wallet.js';
import { TOKENS_TOOLS } from './tokens.js';
import { CONTRACTS_TOOLS } from './contracts.js';
import { DEFI_TOOLS } from './defi.js';
import { NFT_TOOLS } from './nft.js';
import { NETWORK_GAS_TOOLS } from './network-gas.js';
import { HELP_TOOLS } from './help.js';
import { ANALYTICS_TOOLS } from './analytics.js';

// Advanced feature imports
import { MEV_ANALYSIS_TOOLS } from './mev-analysis.js';
import { MEV_TOOLS } from './mev.js';
import { GASLESS_TOOLS } from './gasless.js';
import { ADVANCED_DEFI_TOOLS } from './advanced-defi.js';
import { TOKEN_STREAMING_TOOLS } from './streaming.js';
import { TOKEN_FACTORY_TOOLS } from './token-factory.js';
import { STAKING_TOOLS } from './staking.js';
import { LENDING_TOOLS } from './lending.js';
import { ENS_TOOLS } from './ens.js';

// Additional category imports
import { JSON_RPC_TOOLS } from './json-rpc.js';
import { BATCH_TOOLS } from './batch.js';
import { ERC20_VIEWS_TOOLS } from './erc20-views.js';
import { BRIDGE_TOOLS } from './bridge.js';
import { YIELD_FARMING_TOOLS } from './yield-farming.js';
import { GOVERNANCE_TOOLS } from './governance.js';
import { IPFS_TOOLS } from './ipfs.js';
import { LOGS_TOOLS } from './logs.js';
import { MEMPOOL_TOOLS } from './mempool.js';
import { ORACLE_TOOLS } from './oracle.js';
import { SIGNATURES_TOOLS } from './signatures.js';

// Aggregated tool list - ALL 111 tools
export const TOOLS: Tool[] = [
    // Core categories (70 tools)
    ...CORE_TOOLS,          // 11 tools
    ...WALLET_TOOLS,        // 5 tools
    ...TOKENS_TOOLS,        // 8 tools
    ...CONTRACTS_TOOLS,     // 8 tools
    ...DEFI_TOOLS,          // 8 tools
    ...NFT_TOOLS,           // 14 tools
    ...NETWORK_GAS_TOOLS,   // 8 tools
    ...HELP_TOOLS,          // 3 tools
    ...ANALYTICS_TOOLS,     // 5 tools

    // Advanced features (41 tools)
    ...MEV_ANALYSIS_TOOLS,       // 3 tools
    ...MEV_TOOLS,                // 1 tool (send_private_transaction)
    ...GASLESS_TOOLS,            // 2 tools
    ...ADVANCED_DEFI_TOOLS,      // 2 tools
    ...TOKEN_STREAMING_TOOLS,    // 1 tool
    ...TOKEN_FACTORY_TOOLS,      // 1 tool
    ...STAKING_TOOLS,            // 2 tools
    ...LENDING_TOOLS,            // 1 tool
    ...ENS_TOOLS,                // 1 tool
    ...JSON_RPC_TOOLS,           // 9 tools
    ...BATCH_TOOLS,              // 1 tool
    ...ERC20_VIEWS_TOOLS,        // 4 tools
    ...BRIDGE_TOOLS,             // 5 tools
    ...YIELD_FARMING_TOOLS,      // 4 tools
    ...GOVERNANCE_TOOLS,         // 1 tool
    ...IPFS_TOOLS,               // 0 tools (integrated into NFT_TOOLS)
    ...LOGS_TOOLS,               // 1 tool
    ...MEMPOOL_TOOLS,            // 1 tool
    ...ORACLE_TOOLS,             // 1 tool
    ...SIGNATURES_TOOLS          // 0 tools (integrated into WALLET_TOOLS)
];

// Total: 111 unique tools across 7 EVM chains
