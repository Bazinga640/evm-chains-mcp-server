/**
 * DeFi Protocol Addresses Configuration
 *
 * ⚠️ IMPORTANT: These addresses are subject to change as protocols upgrade.
 * Last verified: January 2025
 *
 * MAINTENANCE SCHEDULE:
 * - Review quarterly (Jan, Apr, Jul, Oct)
 * - Check protocol documentation for latest deployments
 * - Test flash loan functionality after any address updates
 *
 * VERIFICATION SOURCES:
 * - Aave V3: https://docs.aave.com/developers/deployed-contracts/v3-testnet-addresses
 * - Uniswap V3: https://docs.uniswap.org/contracts/v3/reference/deployments
 * - Balancer: https://docs.balancer.fi/reference/contracts/deployment-addresses.html
 * - Venus: https://docs-v4.venus.io/deployed-contracts/bsc-testnet
 * - PancakeSwap: https://docs.pancakeswap.finance/developers/smart-contracts
 * - QuickSwap: https://docs.quickswap.exchange/reference/smart-contracts
 * - Benqi: https://docs.benqi.fi/protocol/contracts
 * - Radiant: https://docs.radiant.capital/radiant/deployed-contracts
 * - dYdX: https://docs.dydx.exchange/developers/contracts
 */

export interface FlashLoanProvider {
  address: string;
  fee: number; // Percentage fee (e.g., 0.09 = 0.09%)
  verified: string; // ISO date of last verification
  testnet: boolean;
  documentation: string;
}

export type ProviderName =
  | 'aave'
  | 'dydx'
  | 'balancer'
  | 'uniswapV3'
  | 'venus'
  | 'pancakeswap'
  | 'benqi'
  | 'quickswap'
  | 'radiant'
  | 'biswap'
  | 'native';

export type ChainName =
  | 'ethereum'
  | 'polygon'
  | 'avalanche'
  | 'bsc'
  | 'arbitrum'
  | 'base'
  | 'worldchain';

/**
 * Flash Loan Protocol Addresses by Chain
 *
 * ⚠️ TESTNET ADDRESSES - NOT FOR MAINNET USE
 */
export const FLASH_LOAN_PROVIDERS: Record<ChainName, Record<string, FlashLoanProvider>> = {
  ethereum: {
    aave: {
      address: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
      fee: 0.09,
      verified: '2025-01-15',
      testnet: true,
      documentation: 'https://docs.aave.com/developers/deployed-contracts/v3-testnet-addresses'
    },
    dydx: {
      address: '0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e',
      fee: 0,
      verified: '2025-01-15',
      testnet: true,
      documentation: 'https://docs.dydx.exchange/developers/contracts'
    },
    balancer: {
      address: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
      fee: 0,
      verified: '2025-01-15',
      testnet: true,
      documentation: 'https://docs.balancer.fi/reference/contracts/deployment-addresses.html'
    },
    uniswapV3: {
      address: '0x0e017140e3eC950e75FEb937A3a42bB3550499bd',
      fee: 0.05,
      verified: '2025-01-15',
      testnet: true,
      documentation: 'https://docs.uniswap.org/contracts/v3/reference/deployments'
    }
  },
  polygon: {
    aave: {
      address: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      fee: 0.09,
      verified: '2025-01-15',
      testnet: true,
      documentation: 'https://docs.aave.com/developers/deployed-contracts/v3-testnet-addresses'
    },
    balancer: {
      address: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
      fee: 0,
      verified: '2025-01-15',
      testnet: true,
      documentation: 'https://docs.balancer.fi/reference/contracts/deployment-addresses.html'
    },
    quickswap: {
      address: '0xf5b509bB0909a69B1c207E495f687a596C168E12',
      fee: 0.05,
      verified: '2025-01-15',
      testnet: true,
      documentation: 'https://docs.quickswap.exchange/reference/smart-contracts'
    }
  },
  avalanche: {
    aave: {
      address: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      fee: 0.09,
      verified: '2025-01-15',
      testnet: true,
      documentation: 'https://docs.aave.com/developers/deployed-contracts/v3-testnet-addresses'
    },
    benqi: {
      address: '0x486Af39519B6dBF40aE0F5CF27D31dF9DD870E87',
      fee: 0.1,
      verified: '2025-01-15',
      testnet: true,
      documentation: 'https://docs.benqi.fi/protocol/contracts'
    }
  },
  bsc: {
    venus: {
      address: '0xfD36E2c2a6789Db23113685031d7F16329158384',
      fee: 0.03,
      verified: '2025-01-15',
      testnet: true,
      documentation: 'https://docs-v4.venus.io/deployed-contracts/bsc-testnet'
    },
    pancakeswap: {
      address: '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4',
      fee: 0.05,
      verified: '2025-01-15',
      testnet: true,
      documentation: 'https://docs.pancakeswap.finance/developers/smart-contracts'
    },
    biswap: {
      address: '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8',
      fee: 0.03,
      verified: '2025-01-15',
      testnet: true,
      documentation: 'https://docs.biswap.org/products/exchange'
    }
  },
  arbitrum: {
    aave: {
      address: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      fee: 0.09,
      verified: '2025-01-15',
      testnet: true,
      documentation: 'https://docs.aave.com/developers/deployed-contracts/v3-testnet-addresses'
    },
    radiant: {
      address: '0xF4B1486DD74D07706052A33d31d7c0AAFD0659E1',
      fee: 0.05,
      verified: '2025-01-15',
      testnet: true,
      documentation: 'https://docs.radiant.capital/radiant/deployed-contracts'
    }
  },
  base: {
    aave: {
      address: '0x18Cd890F4e23422DC4aa8C2D6E0Bd3F3bD8873B8',
      fee: 0.09,
      verified: '2025-01-15',
      testnet: true,
      documentation: 'https://docs.aave.com/developers/deployed-contracts/v3-testnet-addresses'
    },
    uniswap: {
      address: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
      fee: 0.05,
      verified: '2025-01-15',
      testnet: true,
      documentation: 'https://docs.uniswap.org/contracts/v3/reference/deployments'
    }
  },
  worldchain: {
    native: {
      address: '0x0000000000000000000000000000000000000000',
      fee: 0.1,
      verified: '2025-01-15',
      testnet: true,
      documentation: 'https://docs.worldchain.io/ (placeholder - protocol not yet deployed)'
    }
  }
};

/**
 * Check if a provider address needs verification
 * Returns true if last verification was > 90 days ago
 */
export function needsVerification(provider: FlashLoanProvider): boolean {
  const lastVerified = new Date(provider.verified);
  const now = new Date();
  const daysSinceVerification = (now.getTime() - lastVerified.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceVerification > 90;
}

/**
 * Get all providers that need verification
 */
export function getProvidersNeedingVerification(): Array<{
  chain: ChainName;
  provider: string;
  address: string;
  daysSinceVerification: number;
}> {
  const needsUpdate: Array<{
    chain: ChainName;
    provider: string;
    address: string;
    daysSinceVerification: number;
  }> = [];

  for (const [chain, providers] of Object.entries(FLASH_LOAN_PROVIDERS)) {
    for (const [providerName, providerInfo] of Object.entries(providers)) {
      if (needsVerification(providerInfo)) {
        const lastVerified = new Date(providerInfo.verified);
        const now = new Date();
        const daysSinceVerification = Math.floor(
          (now.getTime() - lastVerified.getTime()) / (1000 * 60 * 60 * 24)
        );

        needsUpdate.push({
          chain: chain as ChainName,
          provider: providerName,
          address: providerInfo.address,
          daysSinceVerification
        });
      }
    }
  }

  return needsUpdate;
}

/**
 * Validate provider address format
 */
export function isValidProviderAddress(address: string): boolean {
  // Zero address is placeholder for undeployed protocols
  if (address === '0x0000000000000000000000000000000000000000') {
    return true;
  }

  // Check valid Ethereum address format
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Get provider info with validation
 */
export function getProviderInfo(
  chain: ChainName,
  providerName: string
): FlashLoanProvider | null {
  const chainProviders = FLASH_LOAN_PROVIDERS[chain];
  if (!chainProviders) {
    return null;
  }

  const provider = chainProviders[providerName];
  if (!provider) {
    return null;
  }

  if (!isValidProviderAddress(provider.address)) {
    throw new Error(`Invalid provider address for ${providerName} on ${chain}: ${provider.address}`);
  }

  return provider;
}
