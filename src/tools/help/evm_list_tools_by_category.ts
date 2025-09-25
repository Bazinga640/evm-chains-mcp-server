/**
 * List all tools organized by category
 */

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

export const handleListToolsByCategory = (args: any) => {
    try {
            const toolGroups = {
                core: { description: 'Essential blockchain operations', tools: CORE_TOOLS },
                wallet: { description: 'Wallet management operations', tools: WALLET_TOOLS },
                tokens: { description: 'ERC-20 token operations', tools: TOKENS_TOOLS },
                contracts: { description: 'Smart contract interactions', tools: CONTRACTS_TOOLS },
                defi: { description: 'DeFi protocol operations', tools: DEFI_TOOLS },
                nft: { description: 'NFT (ERC-721/ERC-1155) operations', tools: NFT_TOOLS },
                network: { description: 'Network status and gas operations', tools: NETWORK_GAS_TOOLS },
                analytics: { description: 'On-chain analytics', tools: ANALYTICS_TOOLS },
                events: { description: 'Event and transaction monitoring', tools: EVENT_TOOLS },
                staking: { description: 'Staking and delegation', tools: STAKING_TOOLS },
                mev: { description: 'MEV and transaction ordering', tools: MEV_TOOLS },
                "flash-loan": { description: 'Flash loan operations', tools: FLASH_LOAN_TOOLS },
                "advanced-defi": { description: 'Advanced DeFi strategies', tools: ADVANCED_DEFI_TOOLS },
                "yield-farming": { description: 'Yield farming operations', tools: YIELD_FARMING_TOOLS },
                "mev-analysis": { description: 'MEV analysis tools', tools: MEV_ANALYSIS_TOOLS },
                mempool: { description: 'Mempool monitoring and analysis', tools: MEMPOOL_TOOLS },
                bridge: { description: 'Cross-chain bridge operations', tools: BRIDGE_TOOLS },
                governance: { description: 'DAO and governance tools', tools: GOVERNANCE_TOOLS },
                lending: { description: 'Lending and borrowing protocols', tools: LENDING_TOOLS },
                oracle: { description: 'Oracle data and interactions', tools: ORACLE_TOOLS },
                batch: { description: 'Batch transaction tools', tools: BATCH_TOOLS },
                "token-factory": { description: 'Token factory tools', tools: TOKEN_FACTORY_TOOLS },
                gasless: { description: 'Gasless transaction tools', tools: GASLESS_TOOLS },
                ens: { description: 'ENS and domain management', tools: ENS_TOOLS },
                streaming: { description: 'Token streaming tools', tools: TOKEN_STREAMING_TOOLS },
                help: { description: 'Help and information tools', tools: HELP_TOOLS },
            };
        
            const categories: Record<string, any> = {};
            for (const [key, value] of Object.entries(toolGroups)) {
                if (value.tools.length > 0) {
                    categories[key] = {
                        count: value.tools.length,
                        description: value.description,
                        tools: value.tools.map((t: Tool) => ({ name: t.name, description: (t.description || '').split('\n')[0] }))
                    };
                }
            };

        if (Object.keys(categories).length === 0) {
          return 'No tools available.';
        }

        let output = '';

        // If specific category requested
        if (args.category) {
          const cat = args.category.toLowerCase();
          if (categories[cat]) {
            const category = categories[cat];
            output += `**${cat} (${category.count} tools):** ${category.description}\n`;
            output += category.tools.map((tool: any) => `- **${tool.name}:** ${tool.description}`).join('\n');
          } else {
            return `Error: Category '${args.category}' not found. Available categories are: ${Object.keys(categories).join(', ')}.`;
          }
        } else {
          // Return all categories
          const totalTools = ALL_TOOLS.length;
          output += `### EVM Tools (${totalTools} total)\n\n`;
          for (const catName in categories) {
            const category = categories[catName];
            output += `**${catName} (${category.count} tools):** ${category.description}\n`;
            output += category.tools.map((tool: any) => `- ${tool.name}`).join('\n');
            output += '\n\n';
          }
        }

        return output;
    } catch (error: any) {
        return `Error: ${error.message}`;
    }
}
