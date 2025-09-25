/**
 * Unit tests for evm_create_wallet tool
 * Tests security fix: secrets should not be exposed by default
 */

import { handleCreateWallet } from '../../../../../src/tools/wallet/evm_create_wallet';

describe('evm_create_wallet', () => {
  describe('Security - Default Behavior (Secrets Redacted)', () => {
    it('should NOT include mnemonic by default', async () => {
      const result = await handleCreateWallet({
        chain: 'ethereum'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.wallet.mnemonic).toBeUndefined();
      expect(response.wallet.privateKey).toBeUndefined();
      expect(response.wallet.secretsRedacted).toBe(true);
    }, 30000);

    it('should NOT include private key by default', async () => {
      const result = await handleCreateWallet({
        chain: 'polygon'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.wallet.privateKey).toBeUndefined();
      expect(response.wallet.note).toContain('includeSecrets: true');
    }, 30000);

    it('should include address and public key by default', async () => {
      const result = await handleCreateWallet({
        chain: 'ethereum'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(response.wallet.publicKey).toMatch(/^0x[a-fA-F0-9]+$/);
    }, 30000);
  });

  describe('Security - Opt-In Secrets (includeSecrets: true)', () => {
    it('should include mnemonic when explicitly requested', async () => {
      const result = await handleCreateWallet({
        chain: 'ethereum',
        includeSecrets: true
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.wallet.mnemonic).toBeDefined();
      expect(response.wallet.mnemonic.phrase).toBeDefined();
      expect(response.wallet.mnemonic.wordCount).toBe(12);
      expect(response.wallet.mnemonic.phrase.split(' ')).toHaveLength(12);
    }, 30000);

    it('should include private key when explicitly requested', async () => {
      const result = await handleCreateWallet({
        chain: 'polygon',
        includeSecrets: true
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.wallet.privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
    }, 30000);

    it('should not have secretsRedacted flag when includeSecrets is true', async () => {
      const result = await handleCreateWallet({
        chain: 'ethereum',
        includeSecrets: true
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.wallet.secretsRedacted).toBeUndefined();
      expect(response.wallet.note).toBeUndefined();
    }, 30000);
  });

  describe('Wallet Generation', () => {
    it('should generate unique wallets', async () => {
      const result1 = await handleCreateWallet({ chain: 'ethereum', includeSecrets: true });
      const result2 = await handleCreateWallet({ chain: 'ethereum', includeSecrets: true });

      const wallet1 = JSON.parse(result1.content[0].text);
      const wallet2 = JSON.parse(result2.content[0].text);

      expect(wallet1.wallet.address).not.toBe(wallet2.wallet.address);
      expect(wallet1.wallet.mnemonic.phrase).not.toBe(wallet2.wallet.mnemonic.phrase);
    }, 30000);

    it('should generate valid Ethereum addresses', async () => {
      const result = await handleCreateWallet({ chain: 'ethereum' });
      const response = JSON.parse(result.content[0].text);

      expect(response.wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      // Address should be checksummed
      expect(response.wallet.address).not.toBe(response.wallet.address.toLowerCase());
    }, 30000);
  });

  describe('Multi-Chain Support', () => {
    it('should work for all supported chains', async () => {
      const chains = ['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain'];

      for (const chain of chains) {
        const result = await handleCreateWallet({ chain });
        const response = JSON.parse(result.content[0].text);

        expect(response.success).toBe(true);
        expect(response.chain).toBe(chain);
        expect(response.wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      }
    }, 90000);
  });

  describe('Security Warnings', () => {
    it('should include security warnings', async () => {
      const result = await handleCreateWallet({ chain: 'ethereum' });
      const response = JSON.parse(result.content[0].text);

      expect(response.security).toBeDefined();
      expect(response.security.warning).toContain('SECURITY WARNING');
      expect(Array.isArray(response.security.instructions)).toBe(true);
      expect(response.security.instructions.length).toBeGreaterThan(0);
    }, 30000);

    it('should warn about testnet usage', async () => {
      const result = await handleCreateWallet({ chain: 'ethereum' });
      const response = JSON.parse(result.content[0].text);

      const instructions = response.security.instructions.join(' ');
      expect(instructions).toContain('TESTNET');
    }, 30000);
  });

  describe('Response Format', () => {
    it('should return MCP-compliant format', async () => {
      const result = await handleCreateWallet({ chain: 'ethereum' });

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(() => JSON.parse(result.content[0].text)).not.toThrow();
    }, 30000);

    it('should include explorer URL', async () => {
      const result = await handleCreateWallet({ chain: 'ethereum' });
      const response = JSON.parse(result.content[0].text);

      expect(response.explorer).toContain('sepolia.etherscan.io');
      expect(response.explorer).toContain(response.wallet.address);
    }, 30000);

    it('should include next steps', async () => {
      const result = await handleCreateWallet({ chain: 'polygon' });
      const response = JSON.parse(result.content[0].text);

      expect(Array.isArray(response.nextSteps)).toBe(true);
      expect(response.nextSteps.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Error Cases', () => {
    it('should reject unsupported chain', async () => {
      const result = await handleCreateWallet({
        chain: 'invalid-chain' as any
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toContain('Unsupported chain');
    });
  });
});
