# Comprehensive Test Plan: EVM Chains MCP Server - Polygon Amoy (108 Tools)

**Last Updated**: 2025-10-28
**Server**: evm-chains-mcp-server
**Target Network**: Polygon Amoy Testnet
**Total Tools to Test**: 108
**Status**: Planning Phase

---

## 🎯 Goal

To comprehensively test all 108 implemented tools of the EVM Chains MCP Server on the Polygon Amoy Testnet, ensuring full functionality, accuracy, and adherence to expected behavior.

---

## 🚀 Scope

*   **All 108 Tools:** Every tool exposed by the server will be tested.
*   **Polygon Amoy Testnet:** All tests will be executed against the Polygon Amoy Testnet.
*   **End-to-End Testing:** Where applicable, tests will cover the full lifecycle of operations (e.g., deploy token, mint, transfer, burn).
*   **Transaction-Based Tools:** Focus on successful execution and accurate gas/cost reporting.
*   **Read-Only Tools:** Focus on accurate data retrieval.

---

## 🧪 Methodology

*   **Test Wallet:** Utilize the designated Polygon Amoy test wallet with sufficient POL for gas and test tokens.
*   **Test Environment:** Local development environment with the MCP server running.
*   **Execution:** A combination of manual execution via CLI/scripting and automated tests where feasible.
*   **Logging:** Detailed logging of tool inputs, outputs, transaction hashes, and any errors.

---

## 🔐 Test Wallet Information

*   **Network**: Polygon Amoy Testnet
*   **Address**: `0x14Fc5950fE254D67dc5D6302cd1eae76dd24C717` (or current primary test wallet)
*   **Funding Status**: Confirmed sufficient POL and test tokens.
*   **Explorer**: `https://amoy.polygonscan.com/address/0x14Fc5950fE254D67dc5D6302cd1eae76dd24C717`

---

## 📊 Tool Categories & Test Cases (High-Level)

We will categorize tests based on the 20 tool categories identified in the server.

### 1. Core Operations (20 tools)
*   **Test Cases**: Get balance, send native transfer, get transaction details, get block info, validate addresses, get chain info, etc.
*   **Expected Outcome**: Accurate data retrieval, successful transaction broadcasts.

### 2. Wallet Management (7 tools)
*   **Test Cases**: Create new wallet, import wallet, generate addresses, sign messages.
*   **Expected Outcome**: Correct wallet generation/import, valid signatures.

### 3. Token Operations (13 tools)
*   **Test Cases**: Deploy ERC-20, mint/burn tokens, transfer, approve, check allowance, get token info/balance.
*   **Expected Outcome**: Successful contract interactions, accurate balance/info retrieval.

### 4. Smart Contract Interactions (8 tools)
*   **Test Cases**: Deploy contract, call read/write functions, get ABI, encode/decode data.
*   **Expected Outcome**: Successful contract deployment/interaction, correct data encoding/decoding.

### 5. DeFi Operations (14 tools)
*   **Test Cases**: Get DEX quotes, execute swaps, add/remove liquidity, get pool info, farming/staking rewards.
*   **Expected Outcome**: Accurate quotes, successful DEX interactions, correct liquidity management.

### 6. NFT Operations (14 tools)
*   **Test Cases**: Mint NFT, transfer NFT, get NFT metadata/owner/balance, approve NFT, IPFS integration.
*   **Expected Outcome**: Successful NFT lifecycle management, correct metadata handling.

### 7. Network & Gas (10 tools)
*   **Test Cases**: Get network status, gas oracle, estimate transaction cost, get block gas limit, ENS resolution.
*   **Expected Outcome**: Accurate network data, reliable gas estimations.

### 8. Analytics (8 tools)
*   **Test Cases**: Account activity, portfolio value, transaction patterns, gas usage, token holdings.
*   **Expected Outcome**: Comprehensive and accurate analytical data.

### 9. Help & Discovery (3 tools)
*   **Test Cases**: Use `evm_help`, `evm_search_tools`, `evm_list_tools_by_category`.
*   **Expected Outcome**: Correct and dynamic display of tool information.

### 10. Staking Operations (2 tools)
*   **Test Cases**: Stake tokens, get staking rewards.
*   **Expected Outcome**: Successful staking interactions, accurate reward tracking.

### 11. MEV Protection (1 tool)
*   **Test Cases**: Send private transaction.
*   **Expected Outcome**: Transaction privacy and front-running protection.

### 12. Flash Loan Operations (1 tool)
*   **Test Cases**: Execute flash loan.
*   **Expected Outcome**: Atomic flash loan execution with proper validation.

### 13. Advanced DeFi (1 tool)
*   **Test Cases**: Get impermanent loss.
*   **Expected Outcome**: Accurate IL calculation.

### 14. Mempool Operations (1 tool)
*   **Test Cases**: Get mempool info.
*   **Expected Outcome**: Real-time mempool data retrieval.

### 15. Bridge Operations (5 tools)
*   **Test Cases**: Bridge tokens, get bridge status, estimate bridge fees, find routes, track progress.
*   **Expected Outcome**: Successful cross-chain transfers, accurate bridge data.

### 16. Governance Operations (1 tool)
*   **Test Cases**: Cast vote.
*   **Expected Outcome**: Successful DAO governance interaction.

### 17. Event Filtering (1 tool)
*   **Test Cases**: Filter logs.
*   **Expected Outcome**: Accurate event log retrieval.

### 18. Lending Operations (1 tool)
*   **Test Cases**: Supply asset.
*   **Expected Outcome**: Successful asset supply to lending protocols.

### 19. Oracle Operations (1 tool)
*   **Test Cases**: Get price feed.
*   **Expected Outcome**: Accurate price data retrieval from oracles.

### 20. Batch Operations (1 tool)
*   **Test Cases**: Multicall.
*   **Expected Outcome**: Successful batch execution of contract calls.

---

## ✅ Success Criteria

*   **100% of tools tested:** Every tool has a defined test case and has been executed.
*   **95%+ Pass Rate:** A high percentage of tools execute successfully without errors.
*   **Accurate Data:** All read-only tools return expected and accurate data.
*   **Successful Transactions:** All transaction-based tools execute on-chain successfully.
*   **Gas Efficiency:** Gas usage is within expected ranges.

---

## 📝 Test Tracking Table

| Category | Tool Name | Status (✅/❌/🚫/⏳) | Notes |
|----------|-----------|--------------------|-------|
| Core     | `evm_get_balance` | ⏳ PENDING         |       |
| ...      | ...       | ...                | ...   |

---

## 📈 Gas & Cost Analysis

*   **Total POL Spent**: Track actual POL spent during testing.
*   **Average Gas Price**: Monitor gas prices during test execution.

---

## 🐛 Issues & Bugs

*   **Known Issues**: List any pre-existing issues.
*   **New Issues**: Document any new bugs discovered during testing.

---

## 🏁 Final Summary

*   **Total Tools Tested**: [Number] / 108
*   **Overall Pass Rate**: [Percentage]%
*   **Recommendations**: Key findings and next steps.

---

## 📎 Appendix

*   **Test Scripts**: References to automated or manual test scripts.
*   **Transaction Hashes**: List of key transaction hashes for verification.
*   **Deployed Contracts**: Addresses of any contracts deployed during testing.
