/**
 * Test data and fixtures for automated tests
 */

export const TEST_ADDRESSES = {
  // Vitalik's address (public, safe to use for testing)
  vitalik: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',

  // Test address with activity
  testAddress: '0x000000000000000000000000000000000000dEaD',

  // Zero address
  zero: '0x0000000000000000000000000000000000000000',

  // Invalid addresses for negative testing
  invalid: {
    tooShort: '0x123',
    noPrefix: '742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    wrongChecksum: '0x742D35CC6634C0532925A3B844BC9E7595F0BEB',
    notHex: '0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    empty: '',
  }
};

export const TEST_PRIVATE_KEYS = {
  // Test private key (DO NOT USE IN PRODUCTION)
  // This is a well-known test key with public mnemonic
  test: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',

  // Another test key
  test2: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',

  // Invalid keys for testing
  invalid: {
    tooShort: '0x123',
    tooLong: '0x' + '0'.repeat(128),
    notHex: '0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
  }
};

export const TEST_MNEMONICS = {
  // Standard test mnemonic (12 words)
  test: 'test test test test test test test test test test test junk',

  // Expected address for test mnemonic
  testAddress: '0x7e5F4552091A69125d5DfCb7b8C2659029395Bdf',

  // Invalid mnemonics for testing
  invalid: {
    wrongWordCount: 'test test test',
    invalidWords: 'xxx yyy zzz aaa bbb ccc ddd eee fff ggg hhh iii',
    empty: '',
  }
};

export const TEST_TOKEN_ADDRESSES = {
  ethereum: {
    // Sepolia USDC (example - verify actual address)
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  },
  polygon: {
    // Amoy test token
    testToken: '0x0000000000000000000000000000000000001010', // POL token
  }
};

export const TEST_CHAIN_IDS = {
  ethereum: 11155111,    // Sepolia
  polygon: 80002,        // Amoy
  avalanche: 43113,      // Fuji
  bsc: 97,               // BSC Testnet
  arbitrum: 421614,      // Arbitrum Sepolia
  base: 84532,           // Base Sepolia
  worldchain: 4801,      // WorldChain Testnet
};

export const TEST_EXPLORERS = {
  ethereum: 'https://sepolia.etherscan.io',
  polygon: 'https://amoy.polygonscan.com',
  avalanche: 'https://testnet.snowtrace.io',
  bsc: 'https://testnet.bscscan.com',
  arbitrum: 'https://sepolia.arbiscan.io',
  base: 'https://sepolia.basescan.org',
  worldchain: 'https://worldchain-testnet.explorer.alchemy.com',
};

export const TEST_RPC_TIMEOUTS = {
  short: 5000,   // 5 seconds
  medium: 15000, // 15 seconds
  long: 30000,   // 30 seconds
};

/**
 * Generate a random test address for testing
 */
export function generateRandomAddress(): string {
  const randomHex = Math.random().toString(16).substring(2);
  const paddedHex = randomHex.padEnd(40, '0');
  return `0x${paddedHex}`;
}

/**
 * Generate multiple test addresses
 */
export function generateTestAddresses(count: number): string[] {
  return Array.from({ length: count }, () => generateRandomAddress());
}

/**
 * Mock successful balance response
 */
export function mockBalanceResponse(chain: string, address: string) {
  return {
    success: true,
    chain,
    chainId: TEST_CHAIN_IDS[chain as keyof typeof TEST_CHAIN_IDS],
    address,
    balance: {
      wei: '1000000000000000000',
      ether: '1.0',
      formatted: '1.0 ETH'
    },
    nativeToken: 'ETH',
    blockNumber: 123456,
    explorer: `${TEST_EXPLORERS[chain as keyof typeof TEST_EXPLORERS]}/address/${address}`,
    timestamp: new Date().toISOString(),
    executionTime: '123ms'
  };
}

/**
 * Mock error response
 */
export function mockErrorResponse(chain: string, error: string) {
  return {
    success: false,
    error,
    chain,
    timestamp: new Date().toISOString(),
    executionTime: '50ms'
  };
}
