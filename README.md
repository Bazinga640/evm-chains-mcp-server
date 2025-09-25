# EVM Chains MCP Server

> The most comprehensive EVM MCP server - 111 tools across 7 chains with complete DeFi suite

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌟 Features

### Multi-Chain Support (7 EVM Networks)
- Ethereum (Sepolia)
- Polygon (Amoy)
- Avalanche (Fuji)
- Binance Smart Chain (Testnet)
- Arbitrum (Sepolia)
- Base (Sepolia)
- Worldchain (Testnet)

### Comprehensive Tool Set (111 Tools)

The server provides 111 tools across a wide range of categories. For a full, up-to-date list and counts by category, please use the `evm_help` or `evm_list_tools_by_category` commands.

### Future Tool Expansion (TODO)

The following chain-specific tools were planned and can be considered for future development:

**Chain-Specific Tools (48)** - Specialized features:
- Avalanche: Subnets, C-Chain, staking (12 tools)
- Worldchain: World ID, sequencer (15 tools)
- Polygon: Bridge (6 tools)
- Base: L2 features (8 tools)
- Arbitrum: Arbitrum-specific (4 tools)
- BSC: PancakeSwap, BEP-20 (3 tools)

## 🚀 Quick Start

### Installation

```bash
npm install -g evm-chains-mcp-server
```

### Configuration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "evm-chains": {
      "command": "evm-chains-mcp-server",
      "env": {
        "ETHEREUM_RPC_URL": "https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY",
        "POLYGON_RPC_URL": "https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY",
        "AVALANCHE_RPC_URL": "https://api.avax-test.network/ext/bc/C/rpc"
      }
    }
  }
}
```

### Usage Examples

```javascript
// Universal tools - work on any chain
evm_get_balance({
  chain: "ethereum",
  address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
})

// Execute a swap on Avalanche using TraderJoe
evm_execute_swap({
  chain: "avalanche",
  dex: "traderjoe",
  tokenIn: "0x...", // e.g., WAVAX address
  tokenOut: "0x...", // e.g., USDC address
  amountIn: "1.0",
  slippageTolerance: "0.5",
  privateKey: "0x..."
})

// Check NFT on Polygon
evm_get_nft_info({
  chain: "polygon",
  contractAddress: "0x...",
  tokenId: "1"
})
```

## 🎯 Why This Server?

### vs. mcpdotdirect/evm-mcp-server (Market Leader)
- ✅ **3.6x more tools** (108 vs 30)
- ✅ **Complete DeFi suite** (swaps, liquidity, yield)
- ✅ **Advanced help system** (AI-powered tool discovery)
- ✅ **Chain-specific features** (deep integrations)

### vs. GOAT MCP (200+ tools)
- ✅ **EVM-focused** (not split across Solana + EVM)
- ✅ **Specialized for Ethereum ecosystem**
- ✅ **Better organized** (universal vs chain-specific)

### vs. Armor Crypto MCP
- ✅ **Self-hosted** (no API key required)
- ✅ **Open source** (full control & privacy)
- ✅ **Production-ready** (not pre-alpha)

## 📚 Documentation

### Tool Categories

The available tools are organized into primary and advanced categories. For the authoritative, current list and category counts, use `evm_list_tools_by_category`.

#### Core (11 tools)
- `evm_get_balance`: Get native token balance
- `evm_get_transaction`: Get transaction details by hash
- `evm_get_chain_info`: Get comprehensive blockchain information
- `evm_get_block`: Get block information by height or hash
- `evm_validate_address`: Validate Ethereum address format
- `evm_get_account_info`: Get comprehensive account information
- `evm_get_transaction_history`: Get transaction history count
- `evm_send_transaction`: Broadcast a signed transaction
- `evm_send_native_transfer`: Send native tokens
- `evm_get_gas_price`: Get current gas price
- `evm_estimate_gas`: Estimate gas for a transaction

#### Wallet (5 tools)
- `evm_create_wallet`: Generate new wallet with mnemonic
- `evm_import_wallet`: Import wallet from private key or mnemonic
- `evm_generate_address`: Generate new addresses from wallet
- `evm_get_wallet_info`: Get comprehensive wallet information
- `evm_sign_message`: Sign message with private key

#### Tokens (8 tools)
- `evm_get_token_balance`: Get ERC-20 token balance
- `evm_get_token_info`: Get token metadata
- `evm_transfer_token`: Transfer ERC-20 tokens
- `evm_approve_token`: Approve token spending
- `evm_get_token_allowance`: Check token allowance
- `evm_deploy_token`: Deploy new ERC-20 token
- `evm_mint_token`: Mint tokens (if mintable)
- `evm_burn_token`: Burn tokens (if burnable)

#### Contracts (8 tools)
- `evm_call_contract`: Call contract read function
- `evm_send_contract_transaction`: Send transaction to a contract write function
- `evm_get_contract_abi`: Get a verified contract's ABI
- `evm_decode_contract_data`: Decode transaction input data
- `evm_encode_contract_data`: Encode function call into transaction data
- `evm_deploy_contract`: Deploy a smart contract from bytecode
- `evm_encode_function_data`: Encode function call data
- `evm_decode_function_result`: Decode function return data

#### DeFi (8 tools)
- `evm_get_dex_quote`: Get estimated swap output from a DEX
- `evm_execute_swap`: Execute a token swap on a DEX
- `evm_get_pool_info`: Get liquidity pool information
- `evm_add_liquidity`: Add liquidity to a DEX pool
- `evm_remove_liquidity`: Remove liquidity from a DEX pool
- `evm_get_user_liquidity`: Get a user's liquidity positions
- `evm_get_farming_rewards`: Get pending farming/staking rewards
- `evm_claim_farming_rewards`: Claim farming/staking rewards

#### NFT (14 tools)
- `evm_mint_nft`: Mint a new NFT
- `evm_get_nft_metadata`: Get complete NFT metadata
- `evm_transfer_nft`: Transfer an NFT
- `evm_get_nft_balance`: Get the count of NFTs owned in a collection
- `evm_approve_nft`: Approve an address to spend a specific NFT
- `evm_get_nft_approved`: Get the approved address for a specific NFT
- `evm_is_approved_for_all`: Check if an operator is approved for all NFTs
- `evm_set_approval_for_all`: Approve or revoke operator for all NFTs
- `evm_get_nft_info`: Get basic info about an NFT
- `evm_get_nfts_by_owner`: Get all NFTs owned by an address in a collection
- `evm_get_nft_owner`: Get the owner of a specific NFT
- `evm_create_nft_with_ipfs`: Create NFT assets and upload to IPFS
- `evm_upload_image_to_ipfs`: Upload an image to IPFS
- `evm_create_nft_metadata`: Create and upload NFT metadata to IPFS

#### Network & Gas (8 tools)
- `evm_get_network_status`: Get network health metrics
- `evm_get_gas_oracle`: Get gas price recommendations
- `evm_estimate_transaction_cost`: Estimate total transaction cost
- `evm_get_block_gas_limit`: Get block gas limit and usage
- `evm_get_base_fee`: Get EIP-1559 base fee trends
- `evm_get_priority_fee`: Get EIP-1559 priority fee recommendations
- `evm_resolve_ens`: Resolve an ENS name to an address
- `evm_lookup_address`: Reverse resolve an address to an ENS name

#### Analytics (5 tools)
- `evm_get_account_analytics`: Analyze account activity
- `evm_get_portfolio_value`: Calculate total portfolio value
- `evm_get_transaction_analytics`: Analyze transaction patterns
- `evm_get_gas_analytics`: Analyze historical gas usage
- `evm_get_token_holdings_summary`: Get a summary of token holdings

#### Help & Discovery (3 tools)
- `evm_help`: Get help on topics
- `evm_list_tools_by_category`: List all tools
- `evm_search_tools`: Search tools by keyword

### Supported Chains

| Chain | Network | Chain ID | Native Token |
|-------|---------|----------|--------------|
| Ethereum | Sepolia | 11155111 | ETH |
| Polygon | Amoy | 80002 | POL |
| Avalanche | Fuji | 43113 | AVAX |
| BSC | Testnet | 97 | BNB |
| Arbitrum | Sepolia | 421614 | ETH |
| Base | Sepolia | 84532 | ETH |
| Worldchain | Testnet | 4801 | WLD |

## 🔧 Development

```bash
# Clone repository
git clone https://github.com/yourusername/evm-chains-mcp-server.git
cd evm-chains-mcp-server

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Test with MCP Inspector
npm run inspect
```

## 📖 Examples

See [examples/](./examples/) directory for complete usage examples:
- [Basic Operations](./examples/01-basic-operations.md)
- [DeFi Operations](./examples/02-defi-operations.md)
- [NFT Operations](./examples/03-nft-operations.md)
- [Cross-Chain Comparison](./examples/04-cross-chain.md)

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md)

## 📄 License

MIT License - see [LICENSE](./LICENSE)

## 🙏 Acknowledgments

- Built on [Model Context Protocol](https://modelcontextprotocol.io)
- Powered by [ethers.js](https://docs.ethers.org)
- Inspired by the blockchain MCP community

---

**Built with ❤️ for the Ethereum ecosystem**

## Troubleshooting

- **Worldchain Connection:** The public RPC for the Worldchain testnet was updated. The configuration in `src/types/chains.ts` has been corrected to use `https://worldchain-sepolia.g.alchemy.com/public`.
