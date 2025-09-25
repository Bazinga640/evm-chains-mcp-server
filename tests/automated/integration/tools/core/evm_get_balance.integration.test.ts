/**
 * Integration tests for evm_get_balance tool.
 * These tests hit live RPC endpoints and are skipped unless RUN_INTEGRATION_TESTS=true.
 */

import { handleGetBalance } from '../../../../../src/tools/core/evm_get_balance';

const integrationEnabled = process.env.RUN_INTEGRATION_TESTS === 'true';
const describeOrSkip = integrationEnabled ? describe : describe.skip;

describeOrSkip('evm_get_balance (integration)', () => {
  const validAddress = '0x000000000000000000000000000000000000dEaD';

  describe('Success Cases', () => {
    it('should return balance for Ethereum', async () => {
      const result = await handleGetBalance({
        chain: 'ethereum',
        address: validAddress
      });

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.chain).toBe('ethereum');
      expect(response).toHaveProperty('balance');
      expect(response.balance).toHaveProperty('wei');
      expect(response.balance).toHaveProperty('ether');
      expect(response.balance).toHaveProperty('formatted');
    }, 30000);

    it('should return balance for Polygon', async () => {
      const result = await handleGetBalance({
        chain: 'polygon',
        address: validAddress
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.chain).toBe('polygon');
      expect(response.nativeToken).toBe('POL');
    }, 30000);

    it('should return balance for all supported chains', async () => {
      const chains = ['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain'];

      for (const chain of chains) {
        const result = await handleGetBalance({
          chain,
          address: validAddress
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.chain).toBe(chain);
      }
    }, 90000);

    it('should checksum addresses', async () => {
      const lowercaseAddress = '0x000000000000000000000000000000000000dead';
      const result = await handleGetBalance({
        chain: 'ethereum',
        address: lowercaseAddress
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.address).toBe('0x000000000000000000000000000000000000dEaD');
    }, 30000);

    it('should include explorer URL', async () => {
      const result = await handleGetBalance({
        chain: 'ethereum',
        address: validAddress
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.explorer).toContain('sepolia.etherscan.io');
      expect(response.explorer).toContain(validAddress);
    }, 30000);

    it('should include execution time', async () => {
      const result = await handleGetBalance({
        chain: 'ethereum',
        address: validAddress
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.executionTime).toMatch(/^\d+ms$/);
    }, 30000);
  });

  describe('Error Cases', () => {
    it('should reject unsupported chain', async () => {
      const result = await handleGetBalance({
        chain: 'invalid-chain',
        address: validAddress
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toContain('Unsupported chain');
    });

    it('should reject invalid address', async () => {
      const result = await handleGetBalance({
        chain: 'ethereum',
        address: '0xinvalid'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toContain('Invalid address');
    });

    it('should handle empty address', async () => {
      const result = await handleGetBalance({
        chain: 'ethereum',
        address: ''
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
    });

    it('should handle address with wrong length', async () => {
      const result = await handleGetBalance({
        chain: 'ethereum',
        address: '0x123'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
    });
  });

  describe('Response Format', () => {
    it('should return MCP-compliant format', async () => {
      const result = await handleGetBalance({
        chain: 'ethereum',
        address: validAddress
      });

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0].type).toBe('text');

      expect(() => JSON.parse(result.content[0].text)).not.toThrow();
    }, 30000);

    it('should include all required fields', async () => {
      const result = await handleGetBalance({
        chain: 'ethereum',
        address: validAddress
      });

      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('chain');
      expect(response).toHaveProperty('address');
      expect(response).toHaveProperty('balance');
      expect(response).toHaveProperty('nativeToken');
      expect(response).toHaveProperty('explorer');
      expect(response).toHaveProperty('timestamp');
      expect(response).toHaveProperty('executionTime');
    }, 30000);
  });

  describe('Performance', () => {
    it('should respond within 10 seconds', async () => {
      const startTime = Date.now();

      await handleGetBalance({
        chain: 'ethereum',
        address: validAddress
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000);
    }, 15000);
  });
});
