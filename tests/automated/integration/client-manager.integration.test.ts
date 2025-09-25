/**
 * Integration tests for EVMClientManager.
 * Requires live RPC connectivity; skipped unless RUN_INTEGRATION_TESTS=true.
 */

import { EVMClientManager, getClientManager } from '../../../src/client-manager';

const describeOrSkip = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

describeOrSkip('EVMClientManager (integration)', () => {
  let clientManager: EVMClientManager;

  beforeEach(() => {
    clientManager = getClientManager();
  });

  describe('Provider Management', () => {
    it('should initialize providers for all chains', () => {
      const supportedChains = clientManager.getSupportedChains();
      expect(supportedChains).toHaveLength(7);
      expect(supportedChains).toEqual(
        expect.arrayContaining(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain'])
      );
    });

    it('should return provider for valid chain', () => {
      const provider = clientManager.getProvider('ethereum');
      expect(provider).toBeDefined();
      expect(provider).toHaveProperty('getBlockNumber');
    });

    it('should throw error for invalid chain', () => {
      expect(() => clientManager.getProvider('invalid-chain' as any)).toThrow('Unsupported chain');
    });

    it('should track initialization errors', () => {
      const errors = clientManager.getInitializationErrors();
      expect(errors).toBeInstanceOf(Map);
      expect(errors.size).toBe(0);
    });
  });

  describe('Chain Configuration', () => {
    it('should return config for valid chain', () => {
      const config = clientManager.getChainConfig('ethereum');
      expect(config.chainId).toBe(11155111);
      expect(config.name).toBe('Ethereum Sepolia');
      expect(config.nativeToken).toBe('ETH');
    });

    it('should throw error for invalid chain config', () => {
      expect(() => clientManager.getChainConfig('invalid' as any)).toThrow('Invalid chain');
    });
  });

  describe('Address Validation', () => {
    it('should validate correct Ethereum addresses', () => {
      const validAddress = '0x000000000000000000000000000000000000dEaD';
      expect(clientManager.isValidAddress(validAddress)).toBe(true);
    });

    it('should reject invalid addresses', () => {
      expect(clientManager.isValidAddress('0xinvalid')).toBe(false);
      expect(clientManager.isValidAddress('not-an-address')).toBe(false);
      expect(clientManager.isValidAddress('')).toBe(false);
    });

    it('should checksum addresses correctly', () => {
      const lowercase = '0x000000000000000000000000000000000000dead';
      const checksummed = clientManager.getChecksumAddress(lowercase);
      expect(checksummed).toBe('0x000000000000000000000000000000000000dEaD');
    });
  });

  describe('Explorer URLs', () => {
    it('should generate address explorer URL', () => {
      const url = clientManager.getExplorerUrl('ethereum', '0x000000000000000000000000000000000000dEaD');
      expect(url).toBe('https://sepolia.etherscan.io/address/0x000000000000000000000000000000000000dEaD');
    });

    it('should generate transaction explorer URL', () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const url = clientManager.getTransactionExplorerUrl('polygon', txHash);
      expect(url).toContain('amoy.polygonscan.com/tx/');
      expect(url).toContain(txHash);
    });
  });

  describe('Wallet Operations', () => {
    it('should create new wallet', () => {
      const wallet = clientManager.createWallet();
      expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(wallet.mnemonic).toBeDefined();
    });

    it('should import wallet from private key', () => {
      const testPrivateKey = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const wallet = clientManager.importWallet(testPrivateKey);
      expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should import wallet from mnemonic', () => {
      const testMnemonic = 'test test test test test test test test test test test junk';
      const wallet = clientManager.importWalletFromMnemonic(testMnemonic);
      expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(wallet.address).toBe('0x7e5F4552091A69125d5DfCb7b8C2659029395Bdf');
    });
  });

  describe('Connection Testing', () => {
    it('should test connection to Ethereum', async () => {
      const connected = await clientManager.testConnection('ethereum');
      expect(typeof connected).toBe('boolean');
    }, 30000);

    it('should test all connections', async () => {
      const results = await clientManager.testAllConnections();
      expect(Object.keys(results)).toHaveLength(7);
      expect(results).toHaveProperty('ethereum');
      expect(results).toHaveProperty('polygon');
    }, 60000);
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = getClientManager();
      const instance2 = getClientManager();
      expect(instance1).toBe(instance2);
    });
  });
});
