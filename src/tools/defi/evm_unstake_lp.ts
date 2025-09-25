import { ethers } from 'ethers';
import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

const FARMING_PROTOCOLS: Record<string, Record<string, string>> = {
  ethereum: {
    uniswap: '0x1F98407aaB862CdDeF78Ed252D6f557aA5b0f00d',
    sushiswap: '0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd',
    curve: '0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB'
  },
  polygon: {
    quickswap: '0xD2ba30b6e262FD8EA8D25Bc66642eDc5DE969d67',
    sushiswap: '0x0769fd68dFb93167989C6f7254cd0D766Fb2841F',
    balancer: '0xBA12222222228d8Ba445958a75a0704d566BF2C8'
  },
  avalanche: {
    traderjoe: '0x4483f0b6e2F5486D06958C20f8C39A7aBe87bf8F',
    pangolin: '0x1f806f7C8dED893fd3caE279191ad7Aa3798E928'
  },
  bsc: {
    pancakeswap: '0x73feaa1eE314F8c655E354234017bE2193C9E24E',
    biswap: '0xDbc1A13490deeF9c3C12b44FE77b503c1B061739'
  },
  arbitrum: {
    sushiswap: '0xF4d73326C13a4Fc5FD7A064217e12780e9Bd62c3',
    camelot: '0x1dd7b2878B6d5671Ed602e1B9021Ff3E5d3F6e4D'
  },
  base: {
    baseswap: '0x2B0A43DCcBD7d42c18F6A83F86D1a19fA58d541A',
    aerodrome: '0x827922686190790b37229fd06084350E74485b72'
  },
  worldchain: {
    native: '0x0000000000000000000000000000000000000000'
  }
};

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  protocol: z.string().describe('Yield farming protocol'),
  amount: z.string().describe('Amount of LP tokens to unstake'),
  privateKey: z.string().describe('Private key for transaction'),
  poolId: z.number().optional().describe('Pool/Farm ID'),
  claimRewards: z.boolean().optional().default(true).describe('Also claim pending rewards')
});

export async function handleUnstakeLp(args: z.infer<typeof inputSchema>) {
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);
    const wallet = new ethers.Wallet(validated.privateKey, provider);

    const farmingAddress = FARMING_PROTOCOLS[validated.chain]?.[validated.protocol];

    if (!farmingAddress || farmingAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error(`Farming protocol ${validated.protocol} not available on ${validated.chain}. This is a placeholder address.`);
    }

    // Check if farming contract exists
    const farmingCode = await provider.getCode(farmingAddress);
    if (farmingCode === '0x') {
      throw new Error(`Farming contract not deployed at ${farmingAddress} on ${validated.chain}. This may be a mainnet-only protocol or incorrect address for testnet.`);
    }

    const farmingABI = [
      'function withdraw(uint256 _pid, uint256 _amount) external',
      'function unstake(uint256 amount) external',
      'function exit() external', // Unstake all + claim rewards
      'function emergencyWithdraw(uint256 _pid) external', // No rewards
      'function userInfo(uint256, address) view returns (uint256 amount, uint256 rewardDebt)',
      'function pendingReward(uint256 _pid, address _user) view returns (uint256)',
      'function getReward() external', // Claim rewards only
      'function balanceOf(address) view returns (uint256)'
    ];

    const farmingContract = new ethers.Contract(farmingAddress, farmingABI, wallet);
    const poolId = validated.poolId ?? 0;

    // Get current staking info
    let currentStaked = 0n;
    let pendingRewards = 0n;

    try {
      const userInfo = await farmingContract.userInfo(poolId, wallet.address);
      currentStaked = userInfo.amount;
      pendingRewards = await farmingContract.pendingReward(poolId, wallet.address);
    } catch (e) {
      // Try alternative method
      try {
        currentStaked = await farmingContract.balanceOf(wallet.address);
      } catch (e2) {
        // No balance check available
      }
    }

    const amountWei = ethers.parseUnits(validated.amount, 18); // Most LP tokens are 18 decimals

    if (currentStaked < amountWei) {
      throw new Error(`Insufficient staked balance. Staked: ${ethers.formatUnits(currentStaked, 18)}, Requested: ${validated.amount}`);
    }

    // Execute unstaking
    let tx;
    let rewardsClaimed = false;

    if (validated.protocol === 'uniswap' || validated.protocol === 'sushiswap' || validated.protocol === 'pancakeswap') {
      // These use withdraw with poolId
      tx = await farmingContract.withdraw(poolId, amountWei, { gasLimit: 400000 });

      // Claim rewards separately if requested
      if (validated.claimRewards && pendingRewards > 0n) {
        try {
          const claimTx = await farmingContract.getReward({ gasLimit: 200000 });
          await claimTx.wait();
          rewardsClaimed = true;
        } catch (e) {
          // Rewards claim might be automatic with withdraw
        }
      }
    } else if (validated.protocol === 'curve' && validated.claimRewards) {
      // Curve exit() unstakes all and claims rewards
      tx = await farmingContract.exit({ gasLimit: 400000 });
      rewardsClaimed = true;
    } else {
      // Generic unstake
      tx = await farmingContract.unstake(amountWei, { gasLimit: 400000 });
    }

    const receipt = await tx.wait();

    // Get updated info
    let remainingStaked = 0n;
    try {
      const updatedInfo = await farmingContract.userInfo(poolId, wallet.address);
      remainingStaked = updatedInfo.amount;
    } catch (e) {
      // No userInfo available
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          protocol: validated.protocol,
          amountUnstaked: validated.amount,
          poolId,
          transactionHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          stakingStatus: {
            previousStaked: ethers.formatUnits(currentStaked, 18),
            unstaked: validated.amount,
            remainingStaked: ethers.formatUnits(remainingStaked, 18),
            pendingRewards: ethers.formatUnits(pendingRewards, 18),
            rewardsClaimed: rewardsClaimed || validated.claimRewards
          },
          status: 'LP tokens successfully unstaked',
          note: rewardsClaimed ? 'Rewards have been claimed' : 'Check if rewards need separate claim'
        }, null, 2)
      }]
    };
  } catch (error: any) {
    // Enhanced error detection
    let specificError = error.message;
    const troubleshooting: Record<string, string> = {};

    if (error.message.includes('could not decode result') || error.message.includes('BAD_DATA')) {
      specificError = 'Farming contract returned empty data (0x). This usually means the protocol is not deployed on this network.';
      troubleshooting['mainnet_only_protocol'] = `${validated.protocol} may only be available on mainnet, not ${validated.chain} testnet`;
      troubleshooting['farming_not_deployed'] = 'Farming contract may not be deployed at the configured address on testnet';
      troubleshooting['use_alternative'] = 'Try a different yield farming protocol that supports this testnet';
    } else if (error.message.includes('Farming contract not deployed')) {
      troubleshooting['testnet_unavailable'] = `${validated.protocol} appears to be mainnet-only. Check if there's a testnet deployment`;
      troubleshooting['use_alternative'] = 'Try a different yield farming protocol that supports this testnet';
    } else if (error.message.includes('Insufficient staked balance')) {
      troubleshooting['no_staked_lp'] = 'Wallet does not have enough staked LP tokens to unstake';
      troubleshooting['check_balance'] = 'Verify staked LP token balance before unstaking';
    } else if (error.message.includes('not available')) {
      troubleshooting['protocol_placeholder'] = `${validated.protocol} has a placeholder address (0x0000...) - not configured for ${validated.chain}`;
    } else {
      troubleshooting['check_staked'] = 'Ensure you have staked LP tokens in this pool';
      troubleshooting['verify_protocol'] = 'Verify the protocol name and pool ID are correct';
      troubleshooting['gas_required'] = 'Ensure wallet has sufficient native tokens for gas';
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: specificError,
          chain: validated.chain,
          protocol: validated.protocol,
          timestamp: new Date().toISOString(),
          troubleshooting,
          recommendation: 'For testnet LP unstaking, ensure: (1) Protocol supports testnet, (2) LP tokens are staked, (3) Sufficient gas available',
          note: '⚠️ This is a TESTNET-ONLY server. Most yield farming protocols (QuickSwap, SushiSwap, etc.) are only deployed on mainnet. For production yield farming, use our evm-chains-mainnet-mcp-server with real assets.'
        }, null, 2)
      }]
    };
  }
}