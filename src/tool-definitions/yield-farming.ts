import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { OS_GUIDANCE, CHAIN_GUIDANCE, SUPPORTED_CHAINS } from '../constants/guidance.js';

export const YIELD_FARMING_TOOLS: Tool[] = [
    {
        name: 'evm_compound_rewards',
        description: `
Auto-compound DeFi yield farming rewards for optimized returns.

Automatically harvests pending rewards and re-stakes them in the same vault/pool to maximize
compound interest. Supports major yield aggregators across all 7 EVM chains.

CRITICAL RULES:
- Requires gas in native token for transaction
- May require multiple protocol interactions (harvest + stake)
- Some protocols auto-compound (no action needed)
- Minimum reward threshold prevents dust compounding
- Transaction irreversible once confirmed

PARAMETERS:
- chain: EVM chain to execute on (required)
  * Protocol must be deployed on this chain
  * Requires gas in native token

- vaultOrPool: Vault or pool address (required)
  * Format: 0x followed by 40 hex characters
  * Must be valid farming contract

- privateKey: Transaction signer's private key (required, KEEP SECRET)
  * Must be address with staked position
  * Never expose, share, or log

- strategy: Compound strategy (optional, default: auto_compound)
  * claim_and_restake: Harvest rewards then deposit
  * auto_compound: Call protocol's compound function
  * harvest_only: Just claim rewards without re-staking

- minReward: Minimum reward to compound (optional)
  * Prevents compounding dust amounts
  * In reward token units
  * Example: "0.1" to only compound if rewards > 0.1

EXAMPLES:
✅ Auto-compound Beefy vault:
  {chain: "polygon", vaultOrPool: "0x2b2C81e08f1Af8835a78Bb2A90AE924ACE0eA4bE", privateKey: "0xac0974...", strategy: "auto_compound"}

✅ Harvest and re-stake on Yearn:
  {chain: "ethereum", vaultOrPool: "0x...", privateKey: "0x...", strategy: "claim_and_restake", minReward: "0.5"}

✅ Just harvest rewards:
  {chain: "avalanche", vaultOrPool: "0x...", privateKey: "0x...", strategy: "harvest_only"}

❌ Invalid - insufficient gas:
  {chain: "polygon", ...} // No POL for gas

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating operation success
• transactionHash: Transaction hash for tracking
• rewardsHarvested: Amount of rewards claimed
• rewardsCompounded: Amount re-staked
• compoundBoost: Percentage increase in position
• gasUsed: Gas consumed
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Not having gas for transaction
- Compounding dust amounts (use minReward)
- Wrong strategy for protocol
- Not waiting for pending transactions

USE CASES:
- Maximize yield farming returns
- Automate reward management
- Optimize compound frequency
- Batch harvest from multiple pools

SUPPORTED PROTOCOLS:
- Beefy Finance: Auto-compounding vaults
- Yearn Finance: Yield optimization
- Harvest Finance: Automated farming
- Autofarm: Multi-chain yield aggregator
- Adamant Finance: Polygon vaults
- Benqi: Avalanche lending/staking
- Yield Yak: Avalanche auto-compounder
- Alpaca Finance: Leveraged yield farming
- Jones DAO: Arbitrum strategies

GAS COSTS:
- Simple compound: 100,000-150,000 gas
- Claim + restake: 200,000-300,000 gas
- Ethereum Sepolia: ~0.002-0.003 ETH
- Polygon: ~0.00005 POL (very cheap)
- BSC: ~0.0001 BNB

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS, description: 'EVM chain to execute on' },
                vaultOrPool: { type: 'string', description: 'Vault or pool address to compound' },
                privateKey: { type: 'string', description: 'Private key for transaction' },
                strategy: {
                    type: 'string',
                    enum: ['claim_and_restake', 'auto_compound', 'harvest_only'],
                    description: 'Compound strategy (default: auto_compound)'
                },
                minReward: { type: 'string', description: 'Minimum reward amount to compound' }
            },
            required: ['chain', 'vaultOrPool', 'privateKey']
        }
    },
    {
        name: 'evm_get_apy',
        description: `
Calculate APY/APR for DeFi pools and vaults with reward token analysis.

Computes Annual Percentage Yield including base APY from trading fees and bonus APY from
reward tokens. Essential for comparing yield opportunities across protocols and chains.

CRITICAL RULES:
- Read-only operation (no gas cost)
- APY fluctuates based on pool activity
- Includes both base yield and reward incentives
- Historical data may not predict future returns
- Different protocols calculate APY differently

PARAMETERS:
- chain: EVM chain to query (required)
  * Protocol must be deployed on this chain

- protocol: DeFi protocol name (required)
  * Examples: "uniswap", "aave", "curve", "beefy"
  * Case-insensitive

- poolAddress: Pool or vault address (required)
  * Format: 0x followed by 40 hex characters
  * Must be valid pool contract

- includeRewards: Include reward token APY (optional, default: true)
  * true: Returns total APY (base + rewards)
  * false: Returns only base trading fee APY

EXAMPLES:
✅ Get Uniswap V3 pool APY:
  {chain: "ethereum", protocol: "uniswap", poolAddress: "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8", includeRewards: true}

✅ Check Beefy vault yield:
  {chain: "polygon", protocol: "beefy", poolAddress: "0x...", includeRewards: true}

✅ Base APY only (no rewards):
  {chain: "avalanche", protocol: "traderjoe", poolAddress: "0x...", includeRewards: false}

❌ Invalid - wrong protocol name:
  {chain: "polygon", protocol: "uniswapv2", ...} // Use "uniswap"

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• totalAPY: Combined APY (base + rewards)
• baseAPY: APY from trading fees
• rewardAPY: APY from reward tokens
• projectedYields: Object with daily/weekly/monthly/annual estimates
• lastUpdated: Timestamp of calculation
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Confusing APY with APR (APY includes compounding)
- Not accounting for impermanent loss
- Assuming APY is guaranteed (it fluctuates)
- Comparing APY across different risk levels

USE CASES:
- Compare yield opportunities
- Calculate projected earnings
- Monitor pool performance
- Optimize capital allocation
- Track yield farming ROI

APY CALCULATION METHODS:
- Trading Fees: Based on 24h volume and liquidity
- Reward Tokens: Uses emission rate and token price
- Vault APY: Measures pricePerShare growth
- Compound APY: Accounts for auto-compounding

PROTOCOLS SUPPORTED:
- DEXs: Uniswap, SushiSwap, Curve, PancakeSwap, QuickSwap
- Lending: Aave, Compound, Venus, Benqi
- Vaults: Beefy, Yearn, Harvest, Autofarm
- Staking: Various protocol-specific farms

APY vs APR:
- APR: Simple annual rate (no compounding)
- APY: Effective annual rate (includes compounding)
- APY = (1 + APR/n)^n - 1 (n = compounds per year)

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS, description: 'EVM chain to query' },
                protocol: { type: 'string', description: 'DeFi protocol name' },
                poolAddress: { type: 'string', description: 'Pool or vault address' },
                includeRewards: { type: 'boolean', description: 'Include reward token APY (default: true)' }
            },
            required: ['chain', 'protocol', 'poolAddress']
        }
    },
    {
        name: 'evm_stake_lp',
        description: `
Stake LP tokens in yield farms to earn farming rewards.

Deposits liquidity provider (LP) tokens into farming contracts to earn additional yield beyond
trading fees. Automatically approves LP tokens before staking.

CRITICAL RULES:
- Must hold LP tokens to stake
- Requires gas in native token
- Must approve LP tokens for farm contract
- Staked LP tokens cannot be used elsewhere
- Transaction irreversible once confirmed

PARAMETERS:
- chain: EVM chain to execute on (required)
  * Farm must be deployed on this chain
  * Requires gas in native token

- protocol: Yield farming protocol (required)
  * Examples: "uniswap", "sushiswap", "curve", "pancakeswap"
  * Must support the LP token

- lpToken: LP token address to stake (required)
  * Format: 0x followed by 40 hex characters
  * Must be valid ERC-20 LP token

- amount: Amount of LP tokens to stake (required)
  * Human-readable format: "100" = 100 LP tokens
  * Must have sufficient balance

- privateKey: Transaction signer's private key (required, KEEP SECRET)
  * Must be address holding LP tokens
  * Never expose, share, or log

- poolId: Pool/Farm ID (optional)
  * Required for protocols with multiple farms
  * Check protocol docs for pool IDs

EXAMPLES:
✅ Stake LP tokens on SushiSwap:
  {chain: "polygon", protocol: "sushiswap", lpToken: "0x...", amount: "100", privateKey: "0xac0974...", poolId: 0}

✅ Stake on Curve (no poolId):
  {chain: "ethereum", protocol: "curve", lpToken: "0x...", amount: "50.5", privateKey: "0x..."}

✅ Stake on PancakeSwap:
  {chain: "bsc", protocol: "pancakeswap", lpToken: "0x...", amount: "1000", privateKey: "0x...", poolId: 12}

❌ Invalid - insufficient LP tokens:
  {amount: "1000"} // Only have 100 LP tokens

❌ Invalid - missing poolId for multi-pool protocol:
  {chain: "polygon", protocol: "sushiswap", lpToken: "0x...", amount: "100", privateKey: "0x..."} // Need poolId

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating staking success
• transactionHash: Transaction hash for tracking
• lpTokenStaked: Amount of LP tokens staked
• farmingContract: Farm contract address
• estimatedAPY: Expected farming APY
• gasUsed: Gas consumed
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Not having gas for transaction
- Forgetting LP tokens need approval
- Wrong poolId for farm
- Staking when better yields available elsewhere
- Not tracking staked positions

USE CASES:
- Maximize LP token yield
- Earn farming rewards
- Participate in liquidity mining
- Access protocol governance tokens
- Bootstrap new DEX pairs

SUPPORTED PROTOCOLS:
- Uniswap: V2 and V3 farming
- SushiSwap: MasterChef farms
- Curve: Gauge staking
- QuickSwap: Dragon's Lair
- Balancer: Gauge staking
- TraderJoe: MasterChef farms
- Pangolin: PNG rewards
- PancakeSwap: Syrup pools
- Biswap: Farming pools
- Camelot: Nitro pools
- BaseSwap: Farming
- Aerodrome: Gauges

STAKING PROCESS:
1. Check LP token balance
2. Approve LP tokens for farm
3. Call stake/deposit function
4. Rewards start accruing immediately
5. Track position in farm

GAS COSTS:
- Approval: 45,000-50,000 gas
- Staking: 80,000-120,000 gas
- Total: ~125,000-170,000 gas
- Ethereum Sepolia: ~0.002-0.003 ETH
- Polygon: ~0.00005 POL
- BSC: ~0.0001 BNB

REWARDS:
- Accrued per block or second
- Claimable anytime
- May be auto-compounded
- Often protocol governance tokens

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS, description: 'EVM chain to execute on' },
                protocol: { type: 'string', description: 'Yield farming protocol (e.g., uniswap, sushiswap)' },
                lpToken: { type: 'string', description: 'LP token address to stake' },
                amount: { type: 'string', description: 'Amount of LP tokens to stake' },
                privateKey: { type: 'string', description: 'Private key for transaction' },
                poolId: { type: 'number', description: 'Pool/Farm ID for protocols with multiple pools' }
            },
            required: ['chain', 'protocol', 'lpToken', 'amount', 'privateKey']
        }
    },
    {
        name: 'evm_unstake_lp',
        description: `
Unstake LP tokens from yield farms, optionally claiming pending rewards.

Withdraws staked LP tokens from farming contracts back to wallet. Can simultaneously claim
accumulated farming rewards or leave them unclaimed for later.

CRITICAL RULES:
- Must have staked LP tokens to unstake
- Requires gas in native token
- Can claim rewards in same transaction
- Unstaking stops reward accumulation
- Transaction irreversible once confirmed

PARAMETERS:
- chain: EVM chain to execute on (required)
  * Farm must be deployed on this chain
  * Requires gas in native token

- protocol: Yield farming protocol (required)
  * Must match original staking protocol
  * Examples: "uniswap", "sushiswap", "curve"

- amount: Amount of LP tokens to unstake (required)
  * Human-readable format: "100" = 100 LP tokens
  * Must have sufficient staked balance
  * Use "max" or full amount to unstake all

- privateKey: Transaction signer's private key (required, KEEP SECRET)
  * Must be address that staked LP tokens
  * Never expose, share, or log

- poolId: Pool/Farm ID (optional)
  * Required for protocols with multiple farms
  * Must match original staking poolId

- claimRewards: Also claim pending rewards (optional, default: true)
  * true: Withdraw LP tokens AND claim rewards
  * false: Just withdraw LP tokens, leave rewards

EXAMPLES:
✅ Unstake LP tokens and claim rewards:
  {chain: "polygon", protocol: "sushiswap", amount: "100", privateKey: "0xac0974...", poolId: 0, claimRewards: true}

✅ Unstake without claiming rewards:
  {chain: "ethereum", protocol: "curve", amount: "50.5", privateKey: "0x...", claimRewards: false}

✅ Emergency unstake all:
  {chain: "bsc", protocol: "pancakeswap", amount: "max", privateKey: "0x...", poolId: 12}

❌ Invalid - insufficient staked balance:
  {amount: "1000"} // Only have 100 LP tokens staked

❌ Invalid - wrong poolId:
  {chain: "polygon", protocol: "sushiswap", amount: "100", privateKey: "0x...", poolId: 99} // Pool doesn't exist

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating unstaking success
• transactionHash: Transaction hash for tracking
• lpTokenUnstaked: Amount of LP tokens withdrawn
• rewardsClaimed: Rewards claimed (if claimRewards=true)
• remainingStaked: Remaining staked balance
• gasUsed: Gas consumed
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Not having gas for transaction
- Wrong poolId for farm
- Unstaking when better to compound
- Emergency withdraw loses pending rewards
- Not tracking unstaked LP tokens

USE CASES:
- Exit farming position
- Rebalance across farms
- Withdraw liquidity
- Take profits from farming
- Move to better yield opportunities

SUPPORTED PROTOCOLS:
- Uniswap: V2 and V3 farming
- SushiSwap: MasterChef farms
- Curve: Gauge staking
- QuickSwap: Dragon's Lair
- TraderJoe: MasterChef farms
- PancakeSwap: Syrup pools
- And more (see evm_stake_lp for full list)

WITHDRAWAL METHODS:
- withdraw(poolId, amount): Standard withdrawal + rewards
- exit(): Withdraw all + claim all rewards
- unstake(amount): Just unstake, no rewards
- emergencyWithdraw(poolId): Forfeit rewards, just get LP tokens

GAS COSTS:
- Simple unstake: 80,000-100,000 gas
- Unstake + claim: 120,000-150,000 gas
- Ethereum Sepolia: ~0.002-0.003 ETH
- Polygon: ~0.00005 POL
- BSC: ~0.0001 BNB

REWARDS HANDLING:
- claimRewards=true: Transfers rewards to wallet
- claimRewards=false: Rewards stay in farm (claim later)
- Emergency withdrawal: Forfeits all pending rewards

TIMING CONSIDERATIONS:
- Check reward amount before unstaking
- Consider gas costs vs reward value
- May want to compound before unstaking
- Some farms have unstaking cooldowns

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS, description: 'EVM chain to execute on' },
                protocol: { type: 'string', description: 'Yield farming protocol' },
                amount: { type: 'string', description: 'Amount of LP tokens to unstake' },
                privateKey: { type: 'string', description: 'Private key for transaction' },
                poolId: { type: 'number', description: 'Pool/Farm ID' },
                claimRewards: { type: 'boolean', description: 'Also claim pending rewards (default: true)' }
            },
            required: ['chain', 'protocol', 'amount', 'privateKey']
        }
    }
];
