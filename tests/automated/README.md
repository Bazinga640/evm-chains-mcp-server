# EVM Chains MCP Server - Automated Test Suite

Comprehensive test suite for the EVM Chains MCP Server with 71 active tools across 7 chains.

## 📋 Test Coverage Goals

- **Target Coverage**: 70%+ (branches, functions, lines, statements)
- **Test Types**: Unit, Integration, E2E
- **Test Framework**: Jest with ts-jest
- **Chains Tested**: Ethereum, Polygon, Avalanche, BSC, Arbitrum, Base, WorldChain

## 🏗️ Test Structure

```
tests/automated/
├── unit/                    # Unit tests for individual components
│   ├── client-manager.test.ts
│   └── tools/
│       └── core/
│           └── evm_get_balance.test.ts        # mocked, no live RPCs
├── integration/             # Integration tests for tool workflows (guarded by RUN_INTEGRATION_TESTS)
│   ├── multi-chain.test.ts
│   ├── jsonrpc-wrapper.test.ts
│   └── tools/
│       └── core/
│           └── evm_get_balance.integration.test.ts
└── fixtures/                # Test data and mocks
    ├── mock-providers.ts
    ├── test-wallets.json
    └── mock-responses.ts
```

## 🚀 Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/automated/unit/tools/core/evm_get_balance.test.ts

# Run tests in watch mode
npm run test:watch

# Run only unit tests
npm run test:unit

# Run only integration tests (requires RUN_INTEGRATION_TESTS=true)
RUN_INTEGRATION_TESTS=true npm run test:integration
```

## 📝 Writing Tests

### Unit Test Example

```typescript
import { handleGetBalance } from '../../../src/tools/core/evm_get_balance';
import { mockProvider } from '../../fixtures/mock-providers';

describe('evm_get_balance', () => {
  it('should return balance for valid address', async () => {
    const result = await handleGetBalance({
      chain: 'ethereum',
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
    });

    expect(result.content[0].text).toContain('"success": true');
    expect(result.content[0].text).toContain('"balance"');
  });

  it('should reject invalid chain', async () => {
    const result = await handleGetBalance({
      chain: 'invalid-chain',
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
    });

    expect(result.content[0].text).toContain('"success": false');
    expect(result.content[0].text).toContain('Unsupported chain');
  });
});
```

## ✅ Test Checklist

### Core Tools (11 tools)
- [ ] evm_get_balance
- [ ] evm_get_transaction
- [ ] evm_get_block
- [ ] evm_validate_address
- [ ] evm_get_chain_info
- [ ] evm_get_account_info
- [ ] evm_get_transaction_history
- [ ] evm_send_transaction
- [ ] evm_send_native_transfer
- [ ] evm_get_gas_price
- [ ] evm_estimate_gas

### Wallet Tools (5 tools)
- [ ] evm_create_wallet (with includeSecrets flag)
- [ ] evm_import_wallet (verify mnemonic not echoed)
- [ ] evm_generate_address
- [ ] evm_get_wallet_info
- [ ] evm_sign_message

### Token Tools (9 tools)
- [ ] evm_get_token_balance
- [ ] evm_get_token_info
- [ ] evm_transfer_token
- [ ] evm_approve_token
- [ ] evm_get_token_allowance
- [ ] evm_deploy_token
- [ ] evm_mint_token
- [ ] evm_burn_token

### DeFi Tools (14 tools)
- [ ] evm_get_dex_quote
- [ ] evm_execute_swap
- [ ] evm_get_pool_info
- [ ] evm_add_liquidity
- [ ] evm_remove_liquidity
- [ ] And more...

## 🔧 Test Configuration

- **TypeScript**: Full type checking in tests
- **Coverage Threshold**: 70% minimum
- **Timeout**: 30 seconds per test
- **Environment**: Node.js test environment
- **Mocking**: Mock providers for unit tests, real RPCs for E2E

## 📊 Coverage Reports

Coverage reports are generated in `./coverage/`:
- `coverage/lcov-report/index.html` - HTML coverage report
- `coverage/coverage-summary.json` - JSON summary

## 🐛 Debugging Tests

```bash
# Run with debugging
node --inspect-brk node_modules/.bin/jest --runInBand

# Increase logging
DEBUG=* npm test
```

## 🔒 Security Testing

- [ ] Verify secrets are redacted in responses
- [ ] Test includeSecrets flag behavior
- [ ] Validate address checksumming
- [ ] Test private key validation
- [ ] Verify mnemonic is not echoed back

## 🌐 Multi-Chain Testing

Each tool should be tested against all 7 supported chains:
- Ethereum Sepolia
- Polygon Amoy
- Avalanche Fuji
- BSC Testnet
- Arbitrum Sepolia
- Base Sepolia
- WorldChain Testnet

## 📈 Next Steps

1. **Phase 1**: Core tools (11 tools) - Week 1
2. **Phase 2**: Wallet + Token tools (14 tools) - Week 2
3. **Phase 3**: DeFi + NFT tools (23 tools) - Week 3
4. **Phase 4**: Integration + E2E tests - Week 4

## 🤝 Contributing

When adding new tools:
1. Create corresponding test file in `tests/automated/unit/tools/{category}/`
2. Add integration tests if tool interacts with other tools
3. Update this README checklist
4. Ensure coverage remains above 70%
