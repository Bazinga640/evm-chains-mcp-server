# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Quick Reference

**Project**: EVM Chains MCP Server - Multi-chain blockchain tool server
**Tools**: 111 tools across 7 EVM testnet chains
**Chains**: Ethereum (Sepolia), Polygon (Amoy), Avalanche (Fuji), BSC, Arbitrum (Sepolia), Base (Sepolia), Worldchain
**Architecture**: Model Context Protocol (MCP) server using ethers.js v6
**Language**: TypeScript with ES modules

## Essential Commands

```bash
npm run dev          # Development mode with ts-node (recommended)
npm run build        # Compile TypeScript to build/ directory
npm run inspect      # Launch MCP Inspector for testing tools
npm start            # Run compiled server (requires build first)
npm run test         # Run all tests with Jest
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run test:unit    # Run only unit tests
npm run test:integration # Run only integration tests
npm run test:ci      # Run tests in CI mode (unit tests only, with coverage)
```

## Architecture Overview

The server follows a 4-layer architecture pattern:

1. **Client Manager** (`src/client-manager.ts`)
   - Singleton managing ethers.js providers for all 7 chains
   - Initializes providers at startup with RPC URLs from environment/defaults
   - Provides unified interface: `getProvider(chain)`, `getChainConfig(chain)`
   - Handles wallet operations, address validation, explorer URL generation

2. **Tool Definitions** (`src/tool-definitions.ts`)
   - Zod schemas and metadata for all 102 tools
   - Each tool has comprehensive descriptions with examples
   - Used by MCP server's ListTools handler

3. **Tool Handlers Registry** (`src/tool-handlers.ts`)
   - Maps tool names to handler functions: `TOOL_HANDLERS[name]`
   - Currently ~50 active tools (many advanced tools temporarily disabled)
   - Used by MCP server's CallTool handler

4. **Tool Implementations** (`src/tools/{category}/{name}.ts`)
   - Organized in 24 category folders (core, wallet, tokens, contracts, defi, nft, network, etc.)
   - Standard pattern: export `handleToolName` function
   - Returns structured response with success/error state

## Chain Configuration

All tools accept a `chain` parameter specifying target network:

```typescript
evm_get_balance({ chain: 'ethereum', address: '0x...' })
evm_get_balance({ chain: 'polygon', address: '0x...' })
```

RPC URLs configured via environment variables in `.mcp.json`:
- `ETHEREUM_RPC_URL` - Sepolia testnet
- `POLYGON_RPC_URL` - Amoy testnet
- `AVALANCHE_RPC_URL` - Fuji testnet
- `BSC_RPC_URL` - BSC testnet
- `ARBITRUM_RPC_URL` - Arbitrum Sepolia
- `BASE_RPC_URL` - Base Sepolia
- `WORLDCHAIN_RPC_URL` - Worldchain testnet

Public fallback RPCs used if not provided.

## Tool Categories

- **Core** (8 tools): Balance, transactions, blocks, chain info
- **Wallet** (5 tools): Create, import, generate addresses, sign messages
- **Tokens** (8 tools): ERC-20 operations (balance, transfer, approve, deploy, mint, burn)
- **Smart Contracts** (5 tools): Call, execute, ABI retrieval, encode/decode
- **DeFi** (8 tools): DEX quotes, swaps, liquidity pools, farming rewards
- **NFT** (6 tools): Mint, transfer, metadata, IPFS integration
- **Network/Gas** (6 tools): Gas prices, estimates, network status, base fees
- **Account Analytics** (5 tools): Portfolio value, transaction analytics, token holdings
- **Help** (3 tools): Tool search, categorization, help system

## Adding a New Tool

1. Define schema in `src/tool-definitions.ts`:
   ```typescript
   export const EVM_TOOL_NAME_DEFINITION = {
     name: 'evm_tool_name',
     description: 'Tool description with examples',
     inputSchema: zodToJsonSchema(z.object({
       chain: z.string().describe('Target chain'),
       // other params
     }))
   };
   ```

2. Add to TOOLS array at the end of `tool-definitions.ts`

3. Implement handler in `src/tools/{category}/evm_tool_name.ts`:
   ```typescript
   import { getClientManager } from '../../client-manager.js';

   export async function handleToolName(args: {
     chain: string;
     // other params
   }): Promise<{ content: Array<{ type: string; text: string }> }> {
     const clientManager = getClientManager();
     const provider = clientManager.getProvider(args.chain);
     const config = clientManager.getChainConfig(args.chain);

     // Implementation

     return {
       content: [{
         type: 'text',
         text: JSON.stringify({ success: true, data: result }, null, 2)
       }]
     };
   }
   ```

4. Register in `src/tool-handlers.ts`:
   ```typescript
   import { handleToolName } from './tools/{category}/evm_tool_name.js';

   export const TOOL_HANDLERS: Record<string, (args: any) => Promise<any>> = {
     // ...
     evm_tool_name: handleToolName,
   };
   ```

## Testing Tools

Use MCP Inspector to test individual tools:

```bash
npm run inspect
# Opens browser at http://localhost:3000
# Select tools to test with different parameters
```

## Current State

Note: Many advanced tools are temporarily disabled in `tool-handlers.ts` for debugging. Commented-out tools include:
- Staking operations
- MEV protection and analysis
- Flash loans and yield farming
- Cross-chain bridge operations
- Governance, lending, oracle integration
- Batch/multicall operations
- ENS resolution
- Token streaming

To re-enable, uncomment imports and registry entries in `tool-handlers.ts`.

## Configuration

Claude Desktop configuration (`.mcp.json` or equivalent):

```json
{
  "mcpServers": {
    "evm-chains": {
      "command": "node",
      "args": ["/path/to/evm-chains-mcp-server/build/index.js"],
      "env": {
        "ETHEREUM_RPC_URL": "your-sepolia-rpc-url",
        "POLYGON_RPC_URL": "your-amoy-rpc-url"
      }
    }
  }
}
```

## Key Files

- `src/index.ts` - MCP server setup and request handlers
- `src/client-manager.ts` - Provider management singleton
- `src/tool-definitions.ts` - All tool schemas (1000+ lines)
- `src/tool-handlers.ts` - Tool registry mapping names to functions
- `src/types/chains.ts` - Chain configurations and type definitions
- `src/tools/` - 24 category folders with tool implementations
