# Testing Instructions for Gemini

## Your Role

You are responsible for systematically testing all 111 tools in the EVM Chains MCP Server on Polygon Amoy testnet and updating the tracking document (`polygon-amoy.md`) with results.

---

## Testing Workflow

### Step 1: Select Tools to Test

Start with high-priority categories:
1. **Core Operations** (11 tools) - 3 already tested, 8 remaining
2. **Token Operations** (8 tools) - 5 already tested, 3 remaining
3. **Smart Contract Interactions** (8 tools) - All untested
4. **Network & Gas** (8 tools) - 1 tested, 7 remaining
5. **JSON-RPC Wrappers** (9 tools) - 1 tested, 8 remaining

### Step 2: Test Each Tool

For each tool, execute a test case using appropriate parameters:

**Example Test**:
```
Tool: evm_get_balance
Parameters: {
  "chain": "polygon",
  "address": "0x14Fc5950fE254D67dc5D6302cd1eae76dd24C717"
}
Expected: Returns POL balance for the address
```

### Step 3: Record Results

Update `polygon-amoy.md` with:

1. **Change Status**:
   - ⏸️ → ✅ (if test passed)
   - ⏸️ → ❌ (if test failed)
   - ⏸️ → 🔄 (if partial functionality)

2. **Add Test Date**: Use format `YYYY-MM-DD`

3. **Record Result**: `PASS`, `FAIL`, or `ERROR`

4. **Add Notes**: Include:
   - Transaction hash (for on-chain operations)
   - Error messages (if failed)
   - Parameter values used
   - Any edge cases discovered
   - Suggestions for fixes

**Example Update**:
```markdown
| 4 | evm_get_block | ✅ | 2025-10-30 | PASS | Returns block 12345678 with all fields |
```

### Step 4: Update Progress Summary

At the top of `polygon-amoy.md`, update:
- **Tested**: Increment count
- **Passing**: Increment if test passed
- **Failing**: Increment if test failed
- Calculate new percentage

---

## Test Data Reference

### Polygon Amoy Testnet Addresses

**Tokens:**
- USDC: `0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582`
- USDT: `0x0Fd9e8d3aF1aaee056EB9e802c3A762a667b1904`

**Contracts:**
- Uniswap V2 Router: `0x8954AfA98594b838bda56FE4C12a09D7739D179b`

**Test Wallet:**
- Address: `0x14Fc5950fE254D67dc5D6302cd1eae76dd24C717`
- Has POL and test tokens

**Mnemonics:**
- Test mnemonic: `test test test test test test test test test test test junk`

---

## Testing Best Practices

### 1. Read-Only Tools (Quick Tests)
For tools that just read data (no transactions):
- Test with known addresses/contracts
- Verify returned data is accurate
- Check error handling with invalid inputs

**Examples**: `evm_get_balance`, `evm_get_token_info`, `evm_get_block`

### 2. Transaction Tools (Careful Tests)
For tools that send transactions:
- Use small amounts on testnet
- Record transaction hashes in notes
- Verify transaction confirmed on explorer
- Check gas costs are reasonable

**Examples**: `evm_transfer_token`, `evm_deploy_contract`, `evm_mint_nft`

### 3. Complex Tools (Detailed Tests)
For advanced features:
- Test multiple scenarios
- Document edge cases
- Note any limitations
- Suggest improvements if needed

**Examples**: `evm_calculate_arbitrage`, `evm_execute_flash_loan`, `evm_bridge_tokens`

---

## Example Test Session

### Session: Testing Core Operations (Batch 1)

**Tools to test**: `evm_get_block`, `evm_validate_address`, `evm_get_chain_info`

#### Test 1: evm_get_block
```json
{
  "chain": "polygon",
  "blockNumber": "latest"
}
```
**Result**: ✅ PASS - Returns latest block with all fields (number, hash, timestamp, transactions)

#### Test 2: evm_validate_address
```json
{
  "chain": "polygon",
  "address": "0x14Fc5950fE254D67dc5D6302cd1eae76dd24C717"
}
```
**Result**: ✅ PASS - Returns `{ valid: true, checksummed: "0x14Fc..." }`

#### Test 3: evm_get_chain_info
```json
{
  "chain": "polygon"
}
```
**Result**: ✅ PASS - Returns Polygon Amoy testnet details (chainId: 80002, name, etc.)

**Update Document**:
- Tested: 13 → 16
- Passing: 13 → 16
- Coverage: 11.7% → 14.4%
- Add notes for each tool with test details

---

## Handling Failures

When a tool fails:

1. **Record the Error**:
   ```markdown
   | 5 | evm_deploy_token | ❌ | 2025-10-30 | FAIL | Error: BigInt serialization failed at line 45 |
   ```

2. **Add to Known Issues Section**:
   ```markdown
   ### Pending Issues
   1. **evm_deploy_token** - BigInt serialization error when returning totalSupply
      - Error: "Do not know how to serialize a BigInt"
      - Needs fix: Convert BigInt to string before JSON.stringify
      - Priority: HIGH (blocks token deployment)
   ```

3. **Notify User**: Include failed tools in your test summary

---

## Batch Testing Strategy

Test in batches of 5-10 tools per session:

**Batch 1** (Core Operations):
- evm_get_block
- evm_validate_address
- evm_get_chain_info
- evm_estimate_gas
- evm_get_account_info

**Batch 2** (Token Operations):
- evm_deploy_token
- evm_mint_token
- evm_burn_token

**Batch 3** (JSON-RPC):
- evm_get_block_number
- evm_get_chain_id
- evm_call
- evm_get_logs
- evm_get_storage_at

Continue until all 111 tools are tested.

---

## Reporting Format

After each testing session, provide a summary:

```markdown
## Test Session Report - 2025-10-30

**Batch**: Core Operations (Batch 1)
**Tools Tested**: 5
**Results**:
- ✅ Passed: 4
- ❌ Failed: 1
- Total Coverage: 18/111 (16.2%)

**Passed Tools**:
1. evm_get_block - Returns accurate block data
2. evm_validate_address - Validates and checksums addresses
3. evm_get_chain_info - Returns correct Polygon Amoy metadata
4. evm_estimate_gas - Accurate gas estimates

**Failed Tools**:
1. evm_deploy_token - BigInt serialization error (needs fix)

**Next Batch**: Token Operations (Batch 2)
**Recommended**: Fix evm_deploy_token before proceeding
```

---

## Document Maintenance

### Update Frequency
- After each tool test (real-time updates preferred)
- Minimum: After each batch of 5-10 tools
- Always update progress summary at document top

### Commit Changes
After significant progress (every 20-30 tools tested), commit the updated document:
```bash
git add tests/tracking/polygon-amoy.md
git commit -m "test: Validate [X] tools on Polygon Amoy - [Y] passing, [Z] failing"
```

---

## Questions or Issues?

If you encounter:
- **Unclear test requirements**: Ask for clarification
- **Missing test data**: Request additional addresses/contracts
- **Tool not responding**: Note as ERROR and continue
- **Unexpected behavior**: Document thoroughly in notes

---

**Ready to Start Testing!**

Begin with the high-priority Core Operations category and work your way through all 111 tools systematically. Good luck! 🚀
