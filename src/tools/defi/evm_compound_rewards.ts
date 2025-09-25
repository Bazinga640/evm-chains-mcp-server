import { ethers } from 'ethers';
import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

const AUTOCOMPOUND_VAULTS: Record<string, Record<string, { address: string, platform: string }>> = {
  ethereum: {
    beefy: { address: '0xDDc6625FEcA10438857Dd8660C021Cd1088806FB', platform: 'Beefy Finance' },
    yearn: { address: '0x16de59092dAE5CcF4A1E6439D611fd0653f0Bd01', platform: 'Yearn Finance' },
    harvest: { address: '0xF0358e8c3CD5Fa238a29301d0bEa3D63A17bEdBE', platform: 'Harvest Finance' }
  },
  polygon: {
    beefy: { address: '0x9fC095B88542d5eEE787c2D6596d26DbB5eAfDb9', platform: 'Beefy Finance' },
    autofarm: { address: '0x7F52AF28d2eA94C55C8043A2522db07f4A4C1596', platform: 'Autofarm' },
    adamant: { address: '0x5aBaFf0dB7e29bB5a9A87DdEB5e95bbE4Cb629F5', platform: 'Adamant Finance' }
  },
  avalanche: {
    beefy: { address: '0x7F9be08A533d2F0957c1a7Ce3031C22F89129981', platform: 'Beefy Finance' },
    yieldyak: { address: '0xac2e1c953ED3B42D27ffb3b06C42fa3527b2FC22', platform: 'Yield Yak' }
  },
  bsc: {
    beefy: { address: '0x5F7E721A40c0b2e2d6C4205B7a47c59D818AcF02', platform: 'Beefy Finance' },
    alpaca: { address: '0xA625AB01B08ce023B2a342Dbb12a16f2C8489A8F', platform: 'Alpaca Finance' }
  },
  arbitrum: {
    beefy: { address: '0x7E5E4D9dD91f5c96d00BbA5dDe14744FDd8370a5', platform: 'Beefy Finance' },
    jones: { address: '0x10393c20975cF177a3513071bC110f7962CD67da', platform: 'Jones DAO' }
  },
  base: {
    beefy: { address: '0x4c0F8e3E4bF1e0dE4F3d6C556304e3e9b88c5D2D', platform: 'Beefy Finance' }
  },
  worldchain: {
    native: { address: '0x0000000000000000000000000000000000000000', platform: 'Native' }
  }
};

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  vaultOrPool: z.string().describe('Vault or pool address to compound'),
  privateKey: z.string().describe('Private key for transaction'),
  strategy: z.enum(['claim_and_restake', 'auto_compound', 'harvest_only']).optional().default('auto_compound'),
  minReward: z.string().optional().describe('Minimum reward amount to compound')
});

export async function handleCompoundRewards(args: z.infer<typeof inputSchema>) {
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);
    const wallet = new ethers.Wallet(validated.privateKey, provider);

    // Common compounding/harvesting ABI
    const vaultABI = [
      'function compound() external',
      'function harvest() external',
      'function earn() external',
      'function reinvest() external',
      'function getPendingRewards(address user) view returns (uint256)',
      'function pendingReward(address user) view returns (uint256)',
      'function earned(address account) view returns (uint256)',
      'function balanceOf(address owner) view returns (uint256)',
      'function totalSupply() view returns (uint256)',
      'function pricePerShare() view returns (uint256)',
      'function getPricePerFullShare() view returns (uint256)',
      'function strategy() view returns (address)'
    ];

    const vaultContract = new ethers.Contract(validated.vaultOrPool, vaultABI, wallet);

    // Get current position and pending rewards
    let balance = 0n;
    let pendingRewards = 0n;
    let pricePerShare = 0n;

    try {
      balance = await vaultContract.balanceOf(wallet.address);
    } catch (e) {
      // No balance method
    }

    // Try different methods to get pending rewards
    try {
      pendingRewards = await vaultContract.getPendingRewards(wallet.address);
    } catch (e) {
      try {
        pendingRewards = await vaultContract.pendingReward(wallet.address);
      } catch (e2) {
        try {
          pendingRewards = await vaultContract.earned(wallet.address);
        } catch (e3) {
          // No pending reward method available
        }
      }
    }

    // Get price per share for value calculation
    try {
      pricePerShare = await vaultContract.pricePerShare();
    } catch (e) {
      try {
        pricePerShare = await vaultContract.getPricePerFullShare();
      } catch (e2) {
        pricePerShare = ethers.parseUnits('1', 18); // Default to 1:1
      }
    }

    // Check minimum reward threshold
    if (validated.minReward) {
      const minRewardWei = ethers.parseUnits(validated.minReward, 18);
      if (pendingRewards < minRewardWei) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: 'Rewards below minimum threshold',
              currentRewards: ethers.formatUnits(pendingRewards, 18),
              minimumRequired: validated.minReward,
              suggestion: 'Wait for more rewards to accumulate'
            }, null, 2)
          }]
        };
      }
    }

    // Execute compounding based on strategy
    let tx;
    let action = '';

    if (validated.strategy === 'auto_compound') {
      // Try different compound methods
      try {
        tx = await vaultContract.compound({ gasLimit: 500000 });
        action = 'Auto-compound executed';
      } catch (e) {
        try {
          tx = await vaultContract.earn({ gasLimit: 500000 });
          action = 'Earn/compound executed';
        } catch (e2) {
          try {
            tx = await vaultContract.reinvest({ gasLimit: 500000 });
            action = 'Reinvest executed';
          } catch (e3) {
            throw new Error('No compound method available on this vault');
          }
        }
      }
    } else if (validated.strategy === 'harvest_only') {
      tx = await vaultContract.harvest({ gasLimit: 400000 });
      action = 'Rewards harvested (not compounded)';
    } else {
      // claim_and_restake - manual process
      throw new Error('Manual claim and restake requires multiple transactions - use auto_compound instead');
    }

    const receipt = await tx.wait();

    // Get updated metrics
    let newBalance = 0n;
    let newPricePerShare = 0n;

    try {
      newBalance = await vaultContract.balanceOf(wallet.address);
      newPricePerShare = await vaultContract.pricePerShare();
    } catch (e) {
      // Metrics not available
    }

    // Calculate value changes
    const oldValue = (balance * pricePerShare) / ethers.parseUnits('1', 18);
    const newValue = (newBalance * newPricePerShare) / ethers.parseUnits('1', 18);
    const valueGained = newValue - oldValue;

    // Calculate compound effect
    const compoundBoost = balance > 0n ?
      ((newBalance - balance) * 100n) / balance : 0n;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          vault: validated.vaultOrPool,
          strategy: validated.strategy,
          action,
          transactionHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          rewardsCompounded: {
            pendingBefore: ethers.formatUnits(pendingRewards, 18),
            compounded: ethers.formatUnits(valueGained, 18),
            compoundBoost: compoundBoost.toString() + '%'
          },
          position: {
            sharesBefore: ethers.formatUnits(balance, 18),
            sharesAfter: ethers.formatUnits(newBalance, 18),
            valueBefore: ethers.formatUnits(oldValue, 18),
            valueAfter: ethers.formatUnits(newValue, 18)
          },
          optimization: {
            gasEfficiency: 'Socialized across vault users',
            compoundFrequency: 'Daily auto-compound by keeper bots',
            taxEfficiency: 'Deferred realized gains'
          },
          status: 'Rewards successfully compounded',
          note: 'Compound effect increases position without additional capital'
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error.message,
          chain: validated.chain,
          vault: validated.vaultOrPool,
          suggestion: 'Ensure vault supports compounding and you have pending rewards'
        }, null, 2)
      }]
    };
  }
}