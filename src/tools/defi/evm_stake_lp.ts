import { ethers } from 'ethers';
import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

// Major yield farming protocols by chain
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
  protocol: z.string().describe('Yield farming protocol (e.g., uniswap, sushiswap)'),
  lpToken: z.string().describe('LP token address to stake'),
  amount: z.string().describe('Amount of LP tokens to stake'),
  privateKey: z.string().describe('Private key for transaction'),
  poolId: z.number().optional().describe('Pool/Farm ID for protocols with multiple pools')
});

export async function handleStakeLp(args: z.infer<typeof inputSchema>) {
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

    // Validate LP token address
    const lpTokenAddress = clientManager.getChecksumAddress(validated.lpToken);

    // Check if LP token contract exists
    const lpCode = await provider.getCode(lpTokenAddress);
    if (lpCode === '0x') {
      throw new Error(`LP token contract not deployed at ${lpTokenAddress} on ${validated.chain}. Verify the LP token address is correct for this network.`);
    }

    // Common staking/farming ABI
    const farmingABI = [
      'function deposit(uint256 _pid, uint256 _amount) external',
      'function stake(uint256 amount) external',
      'function enter(uint256 _amount) external',
      'function poolInfo(uint256) view returns (address lpToken, uint256 allocPoint, uint256 lastRewardBlock, uint256 accRewardPerShare)',
      'function userInfo(uint256, address) view returns (uint256 amount, uint256 rewardDebt)',
      'function pendingReward(uint256 _pid, address _user) view returns (uint256)',
      'function totalAllocPoint() view returns (uint256)'
    ];

    const farmingContract = new ethers.Contract(farmingAddress, farmingABI, wallet);

    // First approve LP tokens
    const lpContract = new ethers.Contract(
      lpTokenAddress,
      [
        'function approve(address spender, uint256 amount) returns (bool)',
        'function balanceOf(address owner) view returns (uint256)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
        'function totalSupply() view returns (uint256)'
      ],
      wallet
    );

    const decimals = await lpContract.decimals();
    const symbol = await lpContract.symbol();
    const amountWei = ethers.parseUnits(validated.amount, decimals);

    // Check balance
    const balance = await lpContract.balanceOf(wallet.address);
    if (balance < amountWei) {
      throw new Error(`Insufficient LP token balance. Have: ${ethers.formatUnits(balance, decimals)}, Need: ${validated.amount}`);
    }

    // Approve farming contract
    const approveTx = await lpContract.approve(farmingAddress, amountWei);
    await approveTx.wait();

    // Stake LP tokens
    let stakeTx;
    const poolId = validated.poolId ?? 0;

    // Different protocols use different methods
    if (validated.protocol === 'uniswap' || validated.protocol === 'sushiswap' || validated.protocol === 'pancakeswap') {
      stakeTx = await farmingContract.deposit(poolId, amountWei, { gasLimit: 300000 });
    } else if (validated.protocol === 'curve') {
      stakeTx = await farmingContract['stake(uint256)'](amountWei, { gasLimit: 300000 });
    } else {
      // Generic stake method
      stakeTx = await farmingContract.stake(amountWei, { gasLimit: 300000 });
    }

    const receipt = await stakeTx.wait();

    // Get updated staking info
    let stakedAmount = '0';
    let pendingRewards = '0';

    try {
      const userInfo = await farmingContract.userInfo(poolId, wallet.address);
      stakedAmount = ethers.formatUnits(userInfo.amount, decimals);

      const pending = await farmingContract.pendingReward(poolId, wallet.address);
      pendingRewards = ethers.formatUnits(pending, 18); // Most rewards are 18 decimals
    } catch (e) {
      // Some protocols don't have userInfo
      stakedAmount = validated.amount;
    }

    // Get pool info for APR calculation
    let poolShare = '0';
    try {
      const poolInfo = await farmingContract.poolInfo(poolId);
      const totalAlloc = await farmingContract.totalAllocPoint();
      poolShare = ((Number(poolInfo.allocPoint) / Number(totalAlloc)) * 100).toFixed(2);
    } catch (e) {
      poolShare = 'N/A';
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          protocol: validated.protocol,
          lpToken: validated.lpToken,
          lpSymbol: symbol,
          amountStaked: validated.amount,
          poolId,
          transactionHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          stakingInfo: {
            totalStaked: stakedAmount,
            pendingRewards,
            poolShare: poolShare + '%'
          },
          status: 'LP tokens successfully staked',
          note: 'You are now earning yield farming rewards'
        }, null, 2)
      }]
    };
  } catch (error: any) {
    // Enhanced error detection
    let specificError = error.message;
    const troubleshooting: Record<string, string> = {};

    if (error.message.includes('could not decode result') || error.message.includes('BAD_DATA')) {
      specificError = 'Farming/LP token contract returned empty data (0x). This usually means the protocol is not deployed or LP token address is invalid on this network.';
      troubleshooting['mainnet_only_protocol'] = `${validated.protocol} may only be available on mainnet, not ${validated.chain} testnet`;
      troubleshooting['farming_not_deployed'] = 'Farming contract may not be deployed at the configured address on testnet';
      troubleshooting['invalid_lp_token'] = 'LP token address may be incorrect or not deployed on this network';
      troubleshooting['use_alternative'] = 'Try a different yield farming protocol that supports this testnet';
    } else if (error.message.includes('Farming contract not deployed')) {
      troubleshooting['testnet_unavailable'] = `${validated.protocol} appears to be mainnet-only. Check if there's a testnet deployment`;
      troubleshooting['use_alternative'] = 'Try a different yield farming protocol that supports this testnet';
    } else if (error.message.includes('LP token contract not deployed')) {
      troubleshooting['invalid_lp_address'] = 'LP token address is not deployed on this network';
      troubleshooting['verify_address'] = 'Verify the LP token address is correct for the target chain';
    } else if (error.message.includes('Insufficient LP token balance')) {
      troubleshooting['no_lp_tokens'] = 'Wallet does not have enough LP tokens to stake';
      troubleshooting['get_lp_tokens'] = 'First provide liquidity to get LP tokens, then stake them';
    } else if (error.message.includes('not available')) {
      troubleshooting['protocol_placeholder'] = `${validated.protocol} has a placeholder address (0x0000...) - not configured for ${validated.chain}`;
    } else {
      troubleshooting['check_lp_tokens'] = 'Ensure you have LP tokens in your wallet';
      troubleshooting['verify_protocol'] = 'Verify the protocol name and pool ID are correct';
      troubleshooting['approval_failed'] = 'LP token approval may have failed';
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: specificError,
          chain: validated.chain,
          protocol: validated.protocol,
          lpToken: validated.lpToken,
          timestamp: new Date().toISOString(),
          troubleshooting,
          recommendation: 'For testnet yield farming, ensure: (1) Protocol supports testnet, (2) LP token address is valid, (3) Wallet has LP tokens to stake',
          note: '⚠️ This is a TESTNET-ONLY server. Most yield farming protocols (QuickSwap, SushiSwap, etc.) are only deployed on mainnet. For production yield farming, use our evm-chains-mainnet-mcp-server with real assets.'
        }, null, 2)
      }]
    };
  }
}