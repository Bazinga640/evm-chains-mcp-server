import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { OS_GUIDANCE, CHAIN_GUIDANCE, SUPPORTED_CHAINS } from '../constants/guidance.js';

export const HELP_TOOLS: Tool[] = [
    {
        name: 'evm_help',
        description: `
Display comprehensive help about the EVM chains server, tools, and usage.

Provides overview of 108 available tools organized by category. Shows usage examples, supported
chains, and best practices. Optional topic parameter for category-specific help.

CRITICAL RULES:
- No parameters required for general help
- Topic filter for specific categories
- Returns formatted documentation
- Lists all 7 supported EVM chains
- Shows tool counts per category

PARAMETERS:
- topic: Category filter (optional)
  * Valid topics: "core", "wallet", "tokens", "contracts", "defi", "nft", "network", "help", "analytics"
  * Omit for complete overview

EXAMPLES:
✅ Get complete server overview:
  {}

✅ Get help on DeFi operations:
  {topic: "defi"}

✅ Learn about token tools:
  {topic: "tokens"}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• serverInfo: Version, supported chains
• categories: Tool categories with counts
• tools: Matching tools (if topic specified)
• examples: Usage examples
• bestPractices: Recommended workflows

COMMON MISTAKES:
- Using invalid topic names
- Expecting tool implementation details
- Not reading critical rules sections

USE CASES:
- Learn about available tools
- Understand tool organization
- Get started with EVM operations
- Find specific functionality
- Explore advanced features

TOOL CATEGORIES:
- Core: Basic blockchain operations
- Wallet: Private key and address management
- Tokens: ERC-20 token operations
- Contracts: Smart contract interactions
- DeFi: DEX, liquidity, yield farming
- NFT: ERC-721 operations and metadata
- Network: Gas, blocks, chain info
- Help: Discovery and search
- Analytics: Account and transaction analysis

SUPPORTED CHAINS:
${CHAIN_GUIDANCE.split('\n').slice(0, 7).join('\n')}

GETTING STARTED:
1. Use evm_help() for overview
2. Check evm_get_chain_info("all") for chain status
3. Try evm_list_tools_by_category() to browse tools
4. Search with evm_search_tools("your need")

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                topic: {
                    type: 'string',
                    description: 'Optional: Category to get help on (e.g., "core", "wallet", "tokens", "contracts", "defi", "nft", "network", "account", "help")'
                }
            }
        }
    },
    {
        name: 'evm_search_tools',
        description: `
Search for tools by keyword in name, description, or category.

Full-text search across all 108 tools. Searches tool names, descriptions, and categories. Returns
matching tools with descriptions and usage hints. Case-insensitive partial matching.

CRITICAL RULES:
- Minimum 2 characters for query
- Searches names, descriptions, categories
- Case-insensitive matching
- Returns ranked results

PARAMETERS:
- query: Search keyword (required)
  * Minimum 2 characters
  * Examples: "swap", "balance", "nft", "gas"

EXAMPLES:
✅ Find token-related tools:
  {query: "token"}

✅ Search for swap operations:
  {query: "swap"}

✅ Find balance checking tools:
  {query: "balance"}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• matches: Array of matching tools
• count: Number of results
• query: Original search term

USE CASES:
- Find tools by functionality
- Discover related operations
- Explore tool capabilities

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Search query keyword (e.g., "swap", "balance", "nft")'
                }
            },
            required: ['query']
        }
    },
    {
        name: 'evm_list_tools_by_category',
        description: `
List all 108 tools organized by functional category.

Displays complete tool inventory grouped by category: Core, Wallet, Tokens, Contracts, DeFi, NFT,
Network/Gas, Help, Analytics. Optional category filter for specific groups.

CRITICAL RULES:
- Shows all tools if no category specified
- Category filter for focused view
- Includes tool counts per category
- Organized by functionality

PARAMETERS:
- category: Category filter (optional)
  * Valid: "core", "wallet", "tokens", "contracts", "defi", "nft", "network", "account", "help", "analytics"
  * Omit to see all categories

EXAMPLES:
✅ List all tools by category:
  {}

✅ Show only DeFi tools:
  {category: "defi"}

✅ View wallet operations:
  {category: "wallet"}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• categories: Object with category arrays
• totalTools: Total tool count
• categoryCounts: Tools per category

USE CASES:
- Browse available tools
- Understand tool organization
- Find tools by category
- Explore functionality groups

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                category: {
                    type: 'string',
                    description: 'Optional: Specific category to view (e.g., "core", "wallet", "tokens", "contracts", "defi", "nft", "network", "account", "help")'
                }
            }
        }
    }
];
