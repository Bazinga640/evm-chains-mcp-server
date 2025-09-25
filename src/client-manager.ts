/**
 * Multi-Chain EVM Client Manager
 * Manages ethers.js providers for multiple EVM chains
 */

import { ethers } from 'ethers';
import { EVMChain, ChainConfig, CHAIN_CONFIGS, isValidChain } from './types/chains.js';

export class EVMClientManager {
  private providers: Map<EVMChain, ethers.JsonRpcProvider> = new Map();
  private initializationErrors: Map<EVMChain, Error> = new Map();
  private wsProviders: Map<EVMChain, ethers.WebSocketProvider> = new Map();

  /**
   * Get initialization errors for debugging
   */
  getInitializationErrors(): Map<EVMChain, Error> {
    return this.initializationErrors;
  }

  /**
   * Get provider for specific chain
   */
  getProvider(chain: string): ethers.JsonRpcProvider {
    if (!isValidChain(chain)) {
      throw new Error(
        `Unsupported chain: ${chain}. Supported chains: ${this.getSupportedChains().join(', ')}`
      );
    }

    if (!this.providers.has(chain)) {
      this.refreshProvider(chain as EVMChain);
    }

    const provider = this.providers.get(chain as EVMChain);
    if (!provider) {
      throw new Error(`Provider not initialized for chain: ${chain}`);
    }

    return provider;
  }

  /**
   * Get chain configuration
   */
  getChainConfig(chain: string): ChainConfig {
    if (!isValidChain(chain)) {
      throw new Error(`Invalid chain: ${chain}`);
    }
    return CHAIN_CONFIGS[chain];
  }

  /**
   * Get list of supported chains
   */
  getSupportedChains(): EVMChain[] {
    return Object.keys(CHAIN_CONFIGS) as EVMChain[];
  }

  /**
   * Check if chain is supported
   */
  isChainSupported(chain: string): boolean {
    return isValidChain(chain);
  }

  /**
   * Test connection to a specific chain
   */
  async testConnection(chain: string): Promise<boolean> {
    try {
      const provider = this.getProvider(chain);
      const blockNumber = await provider.getBlockNumber();
      return blockNumber > 0;
    } catch (error) {
      try {
        this.refreshProvider(chain as EVMChain);
      } catch {
        // ignore refresh failures, since error is reported via initializationErrors
      }
      return false;
    }
  }

  /**
   * Test all chain connections
   */
  async testAllConnections(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const chain of this.getSupportedChains()) {
      results[chain] = await this.testConnection(chain);
    }

    return results;
  }

  /**
   * Get current block number for a chain
   */
  async getBlockNumber(chain: string): Promise<number> {
    const provider = this.getProvider(chain);
    return await provider.getBlockNumber();
  }

  /**
   * Get network information for a chain
   */
  async getNetwork(chain: string): Promise<ethers.Network> {
    const provider = this.getProvider(chain);
    return await provider.getNetwork();
  }

  /**
   * Get gas price for a chain
   */
  async getGasPrice(chain: string): Promise<bigint> {
    const provider = this.getProvider(chain);
    const feeData = await provider.getFeeData();
    return feeData.gasPrice || 0n;
  }

  /**
   * Format address with chain context
   */
  formatAddressWithChain(chain: string, address: string): string {
    const config = this.getChainConfig(chain);
    return `${address} (${config.name})`;
  }

  /**
   * Get explorer URL for address
   */
  getExplorerUrl(chain: string, address: string): string {
    const config = this.getChainConfig(chain);
    return `${config.explorer}/address/${address}`;
  }

  /**
   * Get explorer URL for transaction
   */
  getTransactionExplorerUrl(chain: string, txHash: string): string {
    const config = this.getChainConfig(chain);
    return `${config.explorer}/tx/${txHash}`;
  }

  /**
   * Get pooled WebSocket provider for mempool/streaming use cases
   * Returns null if no WS URL configured for the chain
   */
  getWebSocketProvider(chain: string): ethers.WebSocketProvider | null {
    if (!isValidChain(chain)) {
      throw new Error(`Unsupported chain: ${chain}`);
    }

    const existing = this.wsProviders.get(chain as EVMChain);
    if (existing) return existing;

    const envKey = `MEMPOOL_WS_${chain.toUpperCase()}_URL`;
    const url = (process.env as any)[envKey];
    if (!url) return null;

    try {
      const ws = new ethers.WebSocketProvider(url);
      // Basic lifecycle management: if closed or error, drop from pool
      // Consumers can re-call getWebSocketProvider to recreate
      // Note: avoid console.* per project rules
      // WebSocket event listeners are handled by ethers internally
      this.wsProviders.set(chain as EVMChain, ws);
      return ws;
    } catch {
      return null;
    }
  }

  /**
   * Explicitly destroy WS provider for a chain (if present)
   */
  destroyWebSocketProvider(chain: string): void {
    const ws = this.wsProviders.get(chain as EVMChain);
    if (ws) {
      try { (ws as any).destroy?.(); } catch { }
      this.wsProviders.delete(chain as EVMChain);
    }
  }

  /**
   * Create a new wallet
   */
  createWallet(): ethers.HDNodeWallet {
    return ethers.Wallet.createRandom();
  }

  /**
   * Import wallet from private key
   */
  importWallet(privateKey: string, chain?: string): ethers.Wallet {
    const wallet = new ethers.Wallet(privateKey);

    if (chain) {
      const provider = this.getProvider(chain);
      return wallet.connect(provider);
    }

    return wallet;
  }

  /**
   * Import wallet from mnemonic
   */
  importWalletFromMnemonic(mnemonic: string, chain?: string): ethers.HDNodeWallet {
    const wallet = ethers.Wallet.fromPhrase(mnemonic);

    if (chain) {
      const provider = this.getProvider(chain);
      return wallet.connect(provider);
    }

    return wallet;
  }

  /**
   * Validate Ethereum address
   */
  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  /**
   * Get checksummed address
   */
  getChecksumAddress(address: string): string {
    return ethers.getAddress(address);
  }

  private refreshProvider(chain: EVMChain): void {
    const config = CHAIN_CONFIGS[chain];
    try {
      const provider = this.createProvider(chain, config);
      this.providers.set(chain, provider);
      this.initializationErrors.delete(chain);
    } catch (error) {
      this.initializationErrors.set(chain, error as Error);
      throw error;
    }
  }

  private createProvider(chain: EVMChain, config: ChainConfig): ethers.JsonRpcProvider {
    return new ethers.JsonRpcProvider(config.rpcUrl, {
      chainId: config.chainId,
      name: config.name
    });
  }
}

// Singleton instance
let clientManager: EVMClientManager | null = null;

export function getClientManager(): EVMClientManager {
  if (!clientManager) {
    clientManager = new EVMClientManager();
  }
  return clientManager;
}
