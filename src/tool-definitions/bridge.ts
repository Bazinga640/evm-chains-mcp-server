import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { OS_GUIDANCE, CHAIN_GUIDANCE, SUPPORTED_CHAINS } from '../constants/guidance.js';

// Bridge tools - cross-chain token bridging
export const BRIDGE_TOOLS: Tool[] = [
    {
        name: 'evm_bridge_tokens',
        description: `
Bridge tokens between EVM chains using official bridge contracts

Supports major bridge protocols for cross-chain token transfers.
Handles approval, fee calculation, and estimated arrival times.

SUPPORTED ROUTES:
- Ethereum ↔ Polygon, Arbitrum, Optimism, Base
- Polygon ↔ Avalanche, BSC
- Arbitrum ↔ Optimism
- All major L1 ↔ L2 bridges

PARAMETERS:
- sourceChain: Source blockchain
- targetChain: Destination blockchain
- token: Token address to bridge
- amount: Amount to bridge
- recipient: Recipient address on target chain (optional)
- privateKey: Private key for signing
- slippage: Slippage tolerance (default 0.5%)

Returns transaction hash, bridge fee, and estimated arrival time.
`,
        inputSchema: {
            type: 'object',
            properties: {
                sourceChain: { type: 'string', enum: SUPPORTED_CHAINS },
                targetChain: { type: 'string', enum: SUPPORTED_CHAINS },
                token: { type: 'string' },
                amount: { type: 'string' },
                recipient: { type: 'string' },
                privateKey: { type: 'string' },
                slippage: { type: 'number', default: 0.5 },
                gasPrice: { type: 'string' }
            },
            required: ['sourceChain', 'targetChain', 'token', 'amount', 'privateKey']
        }
    },
    {
        name: 'evm_estimate_bridge_fee',
        description: `
Estimate total fees for bridging tokens between EVM chains with detailed cost breakdown.

Calculates comprehensive bridge costs including source chain gas, target chain gas, relayer fees,
protocol fees, and finalization costs. Compares canonical bridges vs third-party bridges to help
users choose the most cost-effective route for their cross-chain transfer needs.

CRITICAL RULES:
- Read-only operation (no gas cost)
- Estimates may vary from actual costs (gas prices fluctuate)
- Different bridge protocols have different fee structures
- L2→L1 bridges have additional finalization costs
- Canonical bridges slower but cheaper than third-party
- Urgency affects relayer fee calculations

PARAMETERS:
- sourceChain: Chain to bridge from (required)
  * Must have bridge contract deployed
  * Different chains have different canonical bridges
  * Format: ethereum, polygon, arbitrum, etc.

- targetChain: Chain to bridge to (required)
  * Must be connected to sourceChain via bridge
  * Cannot bridge to same chain
  * Some routes require hub chains

- token: Token address to bridge (required)
  * Format: 0x followed by 40 hex characters
  * Must be supported by bridge protocol
  * Native tokens use wrapped versions
  * Example: USDC has different addresses per chain

- amount: Amount to bridge (required)
  * Human-readable format: "100" = 100 tokens
  * Used to calculate percentage-based fees
  * Affects liquidity availability checks
  * Large amounts may have higher slippage

- bridgeProtocol: Specific bridge to use (optional)
  * Options: canonical, hop, stargate, across, synapse, celer
  * Default: canonical (official bridge)
  * Third-party bridges faster but require trust
  * Each has different fee structure

- urgency: Speed preference (optional, default: standard)
  * Options: economy, standard, fast
  * Affects relayer fee calculation
  * Economy: 10% discount, slower confirmation
  * Standard: Normal fees, normal speed
  * Fast: 50% premium, priority processing

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• totalCost: Complete fee breakdown in USD and native tokens
• sourceGas: Source chain gas fees
• bridgeFee: Bridge protocol fees
• relayerFee: Transaction relayer costs
• targetGas: Destination chain finalization fees
• estimatedTime: Total time to completion
• route: Bridge path used (direct or multi-hop)
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Not accounting for both source and destination gas
- Assuming all bridges have same fee structure
- Forgetting finalization costs on L2→L1 transfers
- Using wrong token addresses for different chains
- Not considering urgency vs cost tradeoffs

USE CASES:
- Compare bridge costs before transferring
- Budget for cross-chain operations
- Choose between canonical vs third-party bridges
- Calculate total cost including gas and fees
- Plan large token transfers across chains

BRIDGE TYPES:
- Canonical: Native chain bridges (most secure, slower)
- Third-party: External protocols (faster, additional trust)
- Layer 2: Optimistic rollup bridges (7-day challenge period)
- Sidechain: Faster but less secure than L2s

FEE COMPONENTS:
1. Source gas: Transaction costs on origin chain
2. Bridge fee: Protocol-specific transfer fees
3. Relayer fee: Speed-based priority fees
4. Target gas: Finalization costs on destination
5. Liquidity fees: Pool-based bridging costs

COST OPTIMIZATION:
- Use canonical bridges for large amounts
- Batch multiple transfers when possible
- Choose economy for non-urgent transfers
- Compare multiple bridge protocols
- Time transfers for low gas periods

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                sourceChain: { type: 'string', enum: SUPPORTED_CHAINS, description: 'Source chain to bridge from' },
                targetChain: { type: 'string', enum: SUPPORTED_CHAINS, description: 'Target chain to bridge to' },
                token: { type: 'string', description: 'Token address to bridge (0x...)' },
                amount: { type: 'string', description: 'Amount to bridge' },
                bridgeProtocol: {
                    type: 'string',
                    enum: ['canonical', 'hop', 'stargate', 'across', 'synapse', 'celer'],
                    description: 'Bridge protocol to use (default: canonical)'
                },
                urgency: {
                    type: 'string',
                    enum: ['economy', 'standard', 'fast'],
                    description: 'Speed preference (default: standard)'
                }
            },
            required: ['sourceChain', 'targetChain', 'token', 'amount']
        }
    },
    {
        name: 'evm_find_bridge_routes',
        description: `
Find all available bridge routes between EVM chains with liquidity and cost analysis.

Discovers direct and multi-hop bridge paths for cross-chain token transfers. Evaluates each route
by speed, security, cost, and liquidity to help users choose optimal bridging strategy. Includes
both canonical (native) and third-party bridge options.

CRITICAL RULES:
- Read-only operation (no gas cost)
- Returns multiple route options for comparison
- Direct routes preferred over multi-hop
- Canonical routes most secure but slowest
- Third-party routes faster but require trust
- Multi-hop increases fees and complexity

PARAMETERS:
- sourceChain: Starting chain (required)
  * Must have bridge support
  * Format: ethereum, polygon, arbitrum, etc.

- targetChain: Destination chain (required)
  * Must be reachable from source
  * Cannot be same as source
  * May require hub chain for indirect routes

- token: Token to bridge (required)
  * Token symbol (USDC, WETH) or address (0x...)
  * Must exist on source chain
  * May have different addresses on target chain
  * Wrapped native tokens for bridging (ETH → WETH)

- amount: Amount to bridge (optional)
  * Used for liquidity checks
  * Format: "100" = 100 tokens
  * Large amounts may limit route options
  * Omit for route discovery only

- preferences: Route preferences (optional)
  * Object with speed, security, maxHops settings
  * Filters routes based on requirements
  * Default: {speed: 'any', security: 'any', maxHops: 2}

  Preference fields:
  - speed: Route speed requirement
    * instant: <5 minutes (third-party only)
    * fast: <30 minutes (third-party)
    * standard: <2 hours (any bridge)
    * any: no speed requirement (default)

  - security: Security level requirement
    * high: Canonical bridges only
    * medium: Established third-party bridges
    * any: All available bridges (default)

  - maxHops: Maximum number of bridge hops
    * 1: Direct routes only
    * 2: One intermediate chain allowed
    * 3: Maximum complexity

EXAMPLES:
✅ Find routes for USDC from Polygon to Ethereum:
  {sourceChain: "polygon", targetChain: "ethereum", token: "USDC", amount: "100"}

✅ Find fastest routes regardless of cost:
  {sourceChain: "arbitrum", targetChain: "base", token: "0x...", preferences: {speed: "instant", security: "any"}}

✅ Find secure routes only:
  {sourceChain: "bsc", targetChain: "avalanche", token: "WETH", preferences: {speed: "any", security: "high", maxHops: 1}}

❌ Invalid - same source and target:
  {sourceChain: "polygon", targetChain: "polygon", token: "USDC"}

❌ Invalid - token not supported:
  {sourceChain: "ethereum", targetChain: "polygon", token: "0xUnknownToken..."}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• routes: Array of available bridge routes
  - protocol: Bridge protocol name
  - path: Chain sequence (source → intermediate → target)
  - estimatedTime: Total time to completion
  - estimatedCost: Total fees in USD and native tokens
  - liquidity: Available liquidity for amount
  - security: Security level (high/medium/low)
  - recommended: Boolean indicating best overall option
• bestRoute: Recommended route with reasoning
• alternatives: Other viable options
• warnings: Any route-specific warnings or limitations
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Not specifying amount for accurate liquidity checks
- Ignoring security implications of third-party bridges
- Not considering multi-hop complexity and fees
- Assuming all tokens available on all bridges
- Forgetting bridge maintenance or downtime

USE CASES:
- Compare bridge options before transferring
- Find cheapest route for large transfers
- Discover fastest paths for urgent transfers
- Plan complex multi-chain strategies
- Research bridge ecosystem capabilities

ROUTE EVALUATION CRITERIA:
1. Direct vs Multi-hop: Direct preferred when available
2. Security: Canonical > Established third-party > New protocols
3. Cost: Lower fees preferred (all else equal)
4. Speed: Faster routes for urgent transfers
5. Liquidity: Must support transfer amount

BRIDGE ECOSYSTEM:
- Canonical: Native chain bridges (Arbitrum Bridge, Polygon Bridge)
- Established: Hop, Stargate, Across, Synapse, Celer
- Layer 2: Optimism, Base, Arbitrum native bridges
- Sidechain: Polygon, BSC native bridges
- Cross-chain: LayerZero, Axelar for complex routes

LIQUIDITY CONSIDERATIONS:
- Major tokens (USDC, WETH) widely supported
- Smaller tokens may have limited bridge options
- Large transfers need sufficient pool liquidity
- Multi-hop routes split liquidity requirements
- Check liquidity before finalizing route choice

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                sourceChain: { type: 'string', enum: SUPPORTED_CHAINS, description: 'Source chain to bridge from' },
                targetChain: { type: 'string', enum: SUPPORTED_CHAINS, description: 'Target chain to bridge to' },
                token: { type: 'string', description: 'Token symbol or address to bridge' },
                amount: { type: 'string', description: 'Amount to bridge (optional)' },
                preferences: {
                    type: 'object',
                    properties: {
                        speed: { type: 'string', enum: ['instant', 'fast', 'standard', 'any'] },
                        security: { type: 'string', enum: ['high', 'medium', 'any'] },
                        maxHops: { type: 'number', default: 2 }
                    }
                }
            },
            required: ['sourceChain', 'targetChain', 'token']
        }
    },
    {
        name: 'evm_get_bridge_status',
        description: `
Check status and phase of cross-chain bridge transaction with security verification.

Analyzes bridge transaction to determine current phase, confirmations, challenge period status,
and security checks. Essential for monitoring bridge operations and understanding withdrawal delays.

CRITICAL RULES:
- Read-only operation (no gas cost)
- Requires transaction to be bridge-related
- L2→L1 withdrawals have 7-day challenge period
- Different bridge types have different events
- Must check both source and destination chains
- Security checks verify merkle proofs and state roots

PARAMETERS:
- chain: Source chain where bridge transaction occurred (required)
  * Must be chain where transaction was initiated
  * Examples: Arbitrum→Ethereum use 'arbitrum', Polygon→Ethereum use 'polygon'

- transactionHash: Bridge transaction hash to check (required)
  * Format: 0x followed by 64 hex characters
  * Must be valid bridge transaction
  * Examples: deposit, withdrawal initiation, message bridge

- bridgeType: Type of bridge protocol (optional)
  * 'native': Chain's native bridge (most secure)
  * 'canonical': Official bridge from chain team
  * 'third-party': External bridge protocols
  * Default: 'canonical'
  * Affects which events to look for

EXAMPLES:
✅ Check Arbitrum→Ethereum withdrawal status:
  {chain: "arbitrum", transactionHash: "0x1234...abcd", bridgeType: "canonical"}

✅ Monitor Polygon→Ethereum deposit:
  {chain: "polygon", transactionHash: "0xabcd...1234"}

✅ Check third-party bridge (Hop/Stargate):
  {chain: "base", transactionHash: "0x9876...fedc", bridgeType: "third-party"}

❌ Invalid - wrong chain (tx was on Arbitrum, not Ethereum):
  {chain: "ethereum", transactionHash: "0xArbitrumTx..."}

❌ Invalid - not a bridge transaction:
  {chain: "arbitrum", transactionHash: "0xRegularSwapTx..."}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• status: Current bridge phase (initiated, confirmed, finalized, completed)
• phase: Detailed phase breakdown with progress percentage
• confirmations: Number of confirmations received
• challengePeriod: Challenge period status (L2→L1 only)
• securityChecks: Array of security verification results
• estimatedTime: Remaining time to completion
• monitoringUrls: Block explorer links for both chains
• warnings: Any issues or delays detected
• executionTime: Time taken in milliseconds

BRIDGE PHASES:
1. Initiated: Transaction submitted on source chain
2. Confirmed: Source chain transaction confirmed
3. Finalized: Bridge message finalized on source
4. Executed: Message executed on destination chain
5. Completed: Final state confirmed on both chains

SECURITY CHECKS:
- Merkle proof verification
- State root validation
- Challenge period monitoring
- Validator signature checks
- Bridge contract integrity

CHALLENGE PERIODS:
- L2→L1 withdrawals: 7 days (can be challenged)
- L1→L2 deposits: Usually immediate
- Sidechain bridges: Vary by protocol

MONITORING:
- Track progress on both source and destination
- Use block explorers for visual confirmation
- Set up alerts for completion
- Monitor for stuck transactions

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS, description: 'Source chain where bridge transaction occurred' },
                transactionHash: { type: 'string', description: 'Bridge transaction hash (0x...)' },
                bridgeType: {
                    type: 'string',
                    enum: ['native', 'canonical', 'third-party'],
                    description: 'Bridge protocol type (default: canonical)'
                }
            },
            required: ['chain', 'transactionHash']
        }
    },
    {
        name: 'evm_track_bridge_progress',
        description: `
Track cross-chain bridge progress across multiple phases with real-time monitoring.

Continuously monitors bridge transaction from source chain initiation through destination chain
finalization. Provides detailed phase-by-phase progress with time estimates and monitoring URLs.

CRITICAL RULES:
- Monitors both source and destination chains
- Multi-phase tracking (6 phases total)
- Requires source chain transaction hash
- Destination tracking requires userAddress for detection
- L2→L1 includes 7-day challenge period
- Progress percentage calculated across all phases

PARAMETERS:
- sourceChain: Chain where bridge was initiated (required)
  * Must be chain where user initiated bridge
  * Examples: 'arbitrum' for Arbitrum→Ethereum, 'polygon' for Polygon→BSC

- targetChain: Destination chain (required)
  * Chain where assets/message will arrive
  * Must be different from sourceChain
  * Examples: 'ethereum', 'polygon', 'arbitrum'

- transactionHash: Source chain transaction hash (required)
  * Format: 0x followed by 64 hex characters
  * Transaction that initiated the bridge
  * Used to track through all phases

- bridgeProtocol: Bridge protocol used (optional)
  * Helps identify correct events and monitoring URLs
  * Examples: 'canonical', 'hop', 'stargate', 'across', 'layerzero'
  * If omitted, attempts auto-detection

- userAddress: User's address on target chain (optional)
  * Required for automatic destination detection
  * Format: 0x followed by 40 hex characters
  * Used to verify final receipt

- includeHistory: Include past phase details (optional, default: true)
  * Shows timestamp for each phase completion
  * Useful for understanding delays
  * Set false for current status only

EXAMPLES:
✅ Track Arbitrum→Ethereum withdrawal:
  {sourceChain: "arbitrum", targetChain: "ethereum", transactionHash: "0x1234...abcd", userAddress: "0x742d35Cc..."}

✅ Monitor Polygon→BSC transfer:
  {sourceChain: "polygon", targetChain: "bsc", transactionHash: "0xabcd...1234", bridgeProtocol: "canonical"}

✅ Track third-party bridge:
  {sourceChain: "base", targetChain: "arbitrum", transactionHash: "0x9876...fedc", bridgeProtocol: "hop"}

❌ Invalid - same source and target:
  {sourceChain: "polygon", targetChain: "polygon", transactionHash: "0x..."}

❌ Invalid - missing userAddress for destination tracking:
  {sourceChain: "arbitrum", targetChain: "ethereum", transactionHash: "0x..."}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• currentPhase: Active phase (1-6)
• progressPercent: Overall completion percentage (0-100%)
• phases: Array of all phases with status and timestamps
• currentStatus: Human-readable status message
• estimatedCompletion: Estimated time remaining
• monitoringUrls: Array of block explorer links
• warnings: Any issues detected
• lastUpdated: Timestamp of last check
• executionTime: Time taken in milliseconds

BRIDGE PHASES TRACKED:
1. Source Initiated: Transaction submitted on source chain
2. Source Confirmed: Transaction confirmed in source block
3. Bridge Processing: Bridge message being processed
4. Destination Pending: Message received on destination
5. Destination Executed: Final transaction executed
6. Completed: All phases complete, assets available

PROGRESS CALCULATION:
- Each phase = 16.67% (1/6 phases)
- Source phases: 33.33% (2 phases)
- Bridge processing: 16.67% (1 phase)
- Destination phases: 33.33% (2 phases)
- Completion: 16.67% (1 phase)

MONITORING FEATURES:
- Real-time phase detection
- Block explorer integration
- Security verification checks
- Challenge period monitoring
- Automatic retry on failures

SECURITY MONITORING:
- Merkle proof validation
- State root verification
- Validator signature checks
- Challenge period alerts
- Fraud proof detection

BRIDGE PROTOCOL SUPPORT:
- Canonical: Arbitrum, Polygon, Optimism native bridges
- Third-party: Hop, Stargate, Across, Synapse, Celer
- Layer 2: Optimistic rollup challenge periods
- Sidechain: Faster but less secure bridges

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                sourceChain: { type: 'string', enum: SUPPORTED_CHAINS, description: 'Source chain where bridge was initiated' },
                targetChain: { type: 'string', enum: SUPPORTED_CHAINS, description: 'Destination chain' },
                transactionHash: { type: 'string', description: 'Source chain transaction hash (0x...)' },
                bridgeProtocol: {
                    type: 'string',
                    enum: ['canonical', 'hop', 'stargate', 'across', 'layerzero', 'synapse', 'celer'],
                    description: 'Bridge protocol used (optional)'
                },
                userAddress: { type: 'string', description: 'User address on target chain (optional)' },
                includeHistory: { type: 'boolean', description: 'Include phase history (default: true)' }
            },
            required: ['sourceChain', 'targetChain', 'transactionHash']
        }
    }
];
