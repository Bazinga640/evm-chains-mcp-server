/**
 * Mocked unit tests for evm_get_balance.
 * These tests avoid live RPC calls by stubbing the client manager.
 */

import { jest } from '@jest/globals';
import { ethers } from 'ethers';
import { handleGetBalance } from '../../../../../src/tools/core/evm_get_balance';

const mockGetClientManager = jest.fn();

jest.mock('../../../../../src/client-manager.js', () => {
  const actual = jest.requireActual('../../../../../src/client-manager.js') as Record<string, unknown>;
  return {
    ...actual,
    getClientManager: () => mockGetClientManager()
  };
});

type MockProvider = {
  getBalance: jest.MockedFunction<(address: string) => Promise<bigint>>;
  getBlockNumber: jest.MockedFunction<() => Promise<number>>;
};

type MockClientManager = {
  isChainSupported: jest.MockedFunction<(chain: string) => boolean>;
  getProvider: jest.MockedFunction<(chain: string) => MockProvider>;
  getChainConfig: jest.MockedFunction<
    (chain: string) => { chainId: number; name: string; nativeToken: string }
  >;
  getChecksumAddress: jest.MockedFunction<(address: string) => string>;
  getExplorerUrl: jest.MockedFunction<(chain: string, address?: string) => string>;
};

const CHECKSUM_ADDRESS = '0x000000000000000000000000000000000000dEaD';

function createMockProvider(overrides: Partial<MockProvider> = {}): MockProvider {
  const provider: MockProvider = {
    getBalance: jest.fn<(address: string) => Promise<bigint>>().mockResolvedValue(
      ethers.parseEther('1.25')
    ),
    getBlockNumber: jest.fn<() => Promise<number>>().mockResolvedValue(12_345)
  };
  return Object.assign(provider, overrides);
}

function createMockClientManager(
  overrides: Partial<MockClientManager> = {},
  providerOverrides: Partial<MockProvider> = {}
): MockClientManager {
  const provider = createMockProvider(providerOverrides);
  const manager: MockClientManager = {
    isChainSupported: jest.fn<(chain: string) => boolean>().mockReturnValue(true),
    getProvider: jest.fn<(chain: string) => MockProvider>().mockReturnValue(provider),
    getChainConfig: jest.fn<
      (chain: string) => { chainId: number; name: string; nativeToken: string }
    >().mockReturnValue({
      chainId: 11155111,
      name: 'Ethereum Sepolia',
      nativeToken: 'ETH'
    }),
    getChecksumAddress: jest.fn<(address: string) => string>().mockReturnValue(CHECKSUM_ADDRESS),
    getExplorerUrl: jest
      .fn<(chain: string, address?: string) => string>()
      .mockReturnValue(
      `https://sepolia.etherscan.io/address/${CHECKSUM_ADDRESS}`
    )
  };

  return Object.assign(manager, overrides);
}

describe('handleGetBalance (unit, mocked)', () => {
  beforeEach(() => {
    mockGetClientManager.mockReset();
  });

  it('returns structured balance data for supported chains', async () => {
    const manager = createMockClientManager();
    mockGetClientManager.mockReturnValue(manager);

    const result = await handleGetBalance({
      chain: 'ethereum',
      address: CHECKSUM_ADDRESS
    });

    const payload = JSON.parse(result.content[0].text);
    expect(payload.success).toBe(true);
    expect(payload.chain).toBe('ethereum');
    expect(payload.balance.formatted).toBe('1.25 ETH');
    expect(manager.getProvider).toHaveBeenCalledWith('ethereum');
    expect(manager.getExplorerUrl).toHaveBeenCalledWith('ethereum', CHECKSUM_ADDRESS);
  });

  it('bubbles provider errors into a structured failure response', async () => {
    const provider = createMockProvider({
      getBalance: jest.fn<(address: string) => Promise<bigint>>().mockRejectedValue(
        new Error('rpc down')
      )
    });
    const manager = createMockClientManager({
      getProvider: jest.fn<(chain: string) => MockProvider>().mockReturnValue(provider)
    });
    mockGetClientManager.mockReturnValue(manager);

    const result = await handleGetBalance({
      chain: 'ethereum',
      address: CHECKSUM_ADDRESS
    });

    const payload = JSON.parse(result.content[0].text);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain('rpc down');
  });

  it('rejects when chain is not supported by the client manager', async () => {
    const manager = createMockClientManager({
      isChainSupported: jest.fn<(chain: string) => boolean>().mockReturnValue(false)
    });
    mockGetClientManager.mockReturnValue(manager);

    const result = await handleGetBalance({
      chain: 'ethereum',
      address: CHECKSUM_ADDRESS
    });

    const payload = JSON.parse(result.content[0].text);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain('Chain not available');
  });

  it('rejects invalid addresses before calling the provider', async () => {
    const manager = createMockClientManager();
    mockGetClientManager.mockReturnValue(manager);

    const result = await handleGetBalance({
      chain: 'ethereum',
      address: '0x123'
    });

    const payload = JSON.parse(result.content[0].text);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain('Invalid address');
    expect(manager.getProvider).not.toHaveBeenCalled();
  });

  it('includes timing metadata in both success and error flows', async () => {
    const manager = createMockClientManager();
    mockGetClientManager.mockReturnValue(manager);

    const success = await handleGetBalance({
      chain: 'ethereum',
      address: CHECKSUM_ADDRESS
    });
    const successPayload = JSON.parse(success.content[0].text);
    expect(successPayload.executionTime).toMatch(/^\d+ms$/);

    const failure = await handleGetBalance({
      chain: 'invalid-chain',
      address: CHECKSUM_ADDRESS
    });
    const failurePayload = JSON.parse(failure.content[0].text);
    expect(failurePayload.executionTime).toMatch(/^\d+ms$/);
  });
});
