/**
 * Integration tests for multi-chain functionality
 * Tests that same operations work consistently across all 7 chains
 */

import { handleGetBalance } from '../../../src/tools/core/evm_get_balance';
import { handleGetChainInfo } from '../../../src/tools/core/evm_get_chain_info';
import { handleValidateAddress } from '../../../src/tools/core/evm_validate_address';
import { handleCreateWallet } from '../../../src/tools/wallet/evm_create_wallet';

describe('Multi-Chain Integration', () => {
  const TEST_CHAINS = ['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain'];
const TEST_ADDRESS = '0x000000000000000000000000000000000000dEaD';

  describe('Chain Info Consistency', () => {
    it('should return chain info for all chains', async () => {
      for (const chain of TEST_CHAINS) {
        const result = await handleGetChainInfo({ chain });
        const response = JSON.parse(result.content[0].text);

        expect(response.success).toBe(true);
        expect(response.chain).toBe(chain);
        expect(response).toHaveProperty('chainId');
        expect(response).toHaveProperty('nativeToken');
        expect(response).toHaveProperty('explorer');
      }
    }, 90000);

    it('should have unique chain IDs', async () => {
      const chainIds = new Set();

      for (const chain of TEST_CHAINS) {
        const result = await handleGetChainInfo({ chain });
        const response = JSON.parse(result.content[0].text);

        expect(chainIds.has(response.chainId)).toBe(false);
        chainIds.add(response.chainId);
      }
    }, 90000);
  });

  describe('Balance Queries Across Chains', () => {
    it('should query balance on all chains', async () => {
      for (const chain of TEST_CHAINS) {
        const result = await handleGetBalance({
          chain,
          address: TEST_ADDRESS
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.chain).toBe(chain);
        expect(response.balance).toHaveProperty('wei');
        expect(response.balance).toHaveProperty('ether');
      }
    }, 120000);
  });

  describe('Address Validation Consistency', () => {
    it('should validate same address across all chains', async () => {
      for (const chain of TEST_CHAINS) {
        const result = await handleValidateAddress({
          chain,
          address: TEST_ADDRESS
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.validation.isValid).toBe(true);
        expect(response.validation.address).toBe(TEST_ADDRESS);
      }
    }, 90000);

    it('should reject invalid address on all chains', async () => {
      for (const chain of TEST_CHAINS) {
        const result = await handleValidateAddress({
          chain,
          address: '0xinvalid'
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.validation.isValid).toBe(false);
      }
    }, 90000);
  });

  describe('Wallet Creation Consistency', () => {
    it('should create wallets on all chains', async () => {
      for (const chain of TEST_CHAINS) {
        const result = await handleCreateWallet({ chain });
        const response = JSON.parse(result.content[0].text);

        expect(response.success).toBe(true);
        expect(response.chain).toBe(chain);
        expect(response.wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      }
    }, 120000);
  });

  describe('Response Format Consistency', () => {
    it('should use consistent MCP format across all chains', async () => {
      for (const chain of TEST_CHAINS) {
        const result = await handleGetBalance({
          chain,
          address: TEST_ADDRESS
        });

        // All responses should have same structure
        expect(result).toHaveProperty('content');
        expect(Array.isArray(result.content)).toBe(true);
        expect(result.content[0]).toHaveProperty('type', 'text');

        const response = JSON.parse(result.content[0].text);
        expect(response).toHaveProperty('success');
        expect(response).toHaveProperty('chain');
        expect(response).toHaveProperty('timestamp');
        expect(response).toHaveProperty('executionTime');
      }
    }, 120000);
  });

  describe('Explorer URL Generation', () => {
    it('should generate unique explorers for each chain', async () => {
      const explorers = new Set();

      for (const chain of TEST_CHAINS) {
        const result = await handleGetBalance({
          chain,
          address: TEST_ADDRESS
        });

        const response = JSON.parse(result.content[0].text);
        const explorerDomain = new URL(response.explorer).hostname;

        expect(explorers.has(explorerDomain)).toBe(false);
        explorers.add(explorerDomain);
      }
    }, 120000);
  });

  describe('Performance Comparison', () => {
    it('should compare response times across chains', async () => {
      const timings: Record<string, number> = {};

      for (const chain of TEST_CHAINS) {
        const startTime = Date.now();
        await handleGetBalance({ chain, address: TEST_ADDRESS });
        timings[chain] = Date.now() - startTime;
      }

      // All chains should respond within reasonable time
      for (const [chain, time] of Object.entries(timings)) {
        expect(time).toBeLessThan(15000); // 15 seconds max per chain
      }

      console.log('Chain response times:', timings);
    }, 150000);
  });
});
