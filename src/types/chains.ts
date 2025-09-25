/**
 * Supported EVM chain definitions
 */

export type EVMChain =
  | 'ethereum'
  | 'polygon'
  | 'avalanche'
  | 'bsc'
  | 'arbitrum'
  | 'base'
  | 'worldchain';

export interface ChainConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  nativeToken: string;
  explorer: string;
  testnet: boolean;
}

export const CHAIN_CONFIGS: Record<EVMChain, ChainConfig> = {
  ethereum: {
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth-sepolia.public.blastapi.io',
    nativeToken: 'ETH',
    explorer: 'https://sepolia.etherscan.io',
    testnet: true
  },
  polygon: {
    name: 'Polygon Amoy',
    chainId: 80002,
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://rpc-amoy.polygon.technology',
    nativeToken: 'POL',
    explorer: 'https://amoy.polygonscan.com',
    testnet: true
  },
  avalanche: {
    name: 'Avalanche Fuji',
    chainId: 43113,
    rpcUrl: process.env.AVALANCHE_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
    nativeToken: 'AVAX',
    explorer: 'https://testnet.snowtrace.io',
    testnet: true
  },
  bsc: {
    name: 'BSC Testnet',
    chainId: 97,
    rpcUrl: process.env.BSC_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545',
    nativeToken: 'BNB',
    explorer: 'https://testnet.bscscan.com',
    testnet: true
  },
  arbitrum: {
    name: 'Arbitrum Sepolia',
    chainId: 421614,
    rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
    nativeToken: 'ETH',
    explorer: 'https://sepolia.arbiscan.io',
    testnet: true
  },
  base: {
    name: 'Base Sepolia',
    chainId: 84532,
    rpcUrl: process.env.BASE_RPC_URL || 'https://sepolia.base.org',
    nativeToken: 'ETH',
    explorer: 'https://sepolia.basescan.org',
    testnet: true
  },
  worldchain: {
    name: 'Worldchain Testnet',
    chainId: 4801,
    rpcUrl: process.env.WORLDCHAIN_RPC_URL || 'https://worldchain-sepolia.g.alchemy.com/public',
    nativeToken: 'WLD',
    explorer: 'https://worldchain-sepolia.explorer.alchemy.com',
    testnet: true
  }
};

export function isValidChain(chain: string): chain is EVMChain {
  return chain in CHAIN_CONFIGS;
}

export function getChainConfig(chain: EVMChain): ChainConfig {
  return CHAIN_CONFIGS[chain];
}

export function getAllChains(): EVMChain[] {
  return Object.keys(CHAIN_CONFIGS) as EVMChain[];
}
