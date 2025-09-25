#!/usr/bin/env node

/**
 * EVM Chains MCP Server
 * The most comprehensive EVM MCP server - 111 tools across 7 chains
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
// Note: keep imports minimal in the MCP entry to avoid unused code

// Import client manager
import { getClientManager } from './client-manager.js';

// Import tool definitions and handlers
import { TOOLS } from './tool-definitions/index.js';
import { TOOL_HANDLERS } from './tool-handlers.js';
import { SUPPORTED_CHAINS } from './constants/guidance.js';

// Import logger (replaces console.error to comply with MCP stdio protocol)
import { debugLog, debugError } from './utils/logger.js';

// Avoid console.* in MCP servers; use file-based debug logger instead
debugLog(`Loaded tools: ${TOOLS.length}`);

// Initialize server
const server = new Server(
  {
    name: 'evm-chains-mcp-server',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Initialize client manager
const clientManager = getClientManager();

/**
 * List Tools Handler
 */
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS
}));

/**
 * Call Tool Handler
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    // Look up handler in registry
    const handler = TOOL_HANDLERS[name];
    if (!handler) {
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${name}`
      );
    }

    return await handler(args);
  } catch (error: any) {
    if (error instanceof McpError) {
      throw error;
    }

    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error.message}`
    );
  }
});

/**
 * Start server
 */
async function main() {
  debugLog('Starting EVM Chains MCP Server...');
  debugLog('Supported chains:', SUPPORTED_CHAINS.join(', '));

  // Check for initialization errors
  const initErrors = clientManager.getInitializationErrors();
  if (initErrors.size > 0) {
    debugLog('⚠️  Provider initialization errors:');
    for (const [chain, error] of initErrors.entries()) {
      debugLog(`  ❌ ${chain}: ${error.message}`);
    }
  }

  // Test connections
  debugLog('Testing chain connections...');
  const connectionResults = await clientManager.testAllConnections();

  for (const [chain, connected] of Object.entries(connectionResults)) {
    const status = connected ? '✅' : '❌';
    debugLog(`  ${status} ${chain}`);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);

  debugLog('EVM Chains MCP Server ready!');
}

main().catch((error) => {
  debugError('Fatal error:', error);
  process.exit(1);
});
