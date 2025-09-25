# GEMINI.md - EVM Chains MCP Server

## Project Overview

This project is a comprehensive Model Context Protocol (MCP) server for interacting with seven different EVM-compatible blockchain testnets: Ethereum (Sepolia), Polygon (Amoy), Avalanche (Fuji), Binance Smart Chain (Testnet), Arbitrum (Sepolia), Base (Sepolia), and Worldchain (Testnet).

It is built with TypeScript and utilizes the `@modelcontextprotocol/sdk` to expose a rich set of 102 tools for a wide range of operations, including core blockchain interactions, DeFi, NFTs, and chain-specific functionalities. The server is designed to be a powerful and versatile backend for applications requiring broad EVM chain support.

## Building and Running

The server is a Node.js project and can be managed using `npm` scripts.

**Installation:**

```bash
npm install
```

**Building:**

```bash
npm run build
```
This command transpiles the TypeScript source code into JavaScript in the `build` directory.

**Running (Development):**

```bash
npm run dev
```
This command runs the server directly from the TypeScript source files using `ts-node`, which is useful for development as it doesn't require a separate build step.

**Running (Production):**

The `package.json` defines a binary that can be used to run the server from the command line after building:

```bash
./build/index.js
```

**Inspecting:**

```bash
npm run inspect
```
This command uses the `@modelcontextprotocol/inspector` to connect to the running server, allowing you to view available tools and make test calls.

## Development Conventions

*   **TypeScript:** The entire codebase is written in TypeScript, providing strong typing for all modules and functions.
*   **MCP SDK:** The server is built upon the `@modelcontextprotocol/sdk`, using its `Server` class to handle MCP requests.
*   **Modular Tools:** Tools are organized into a modular structure within the `src/tools` directory. Each category of tools (e.g., `core`, `defi`, `nft`) has its own subdirectory.
*   **Tool Handlers:** The logic for each tool is contained in a dedicated handler function (e.g., `handleGetBalance`). These handlers are registered in `src/tool-handlers.ts` and mapped to their corresponding tool definitions in `src/tool-definitions.ts`.
*   **Client Manager:** A central `client-manager.ts` is responsible for managing connections and interactions with the different blockchain networks. It provides a consistent interface for getting providers, validating addresses, and accessing chain-specific configurations.
*   **Ethers.js:** The `ethers` library is the primary dependency for all EVM-related operations, such as fetching balances, sending transactions, and interacting with smart contracts.
*   **Input Validation:** Tool handlers perform validation on input arguments (e.g., checking for supported chains and valid addresses) before execution.
*   **Standardized Responses:** Tool handlers return structured JSON objects, providing a consistent and predictable output format for both successful results and errors.
*   **No Test Framework:** There is currently no testing framework (like Jest or Mocha) configured in the project's dependencies.
