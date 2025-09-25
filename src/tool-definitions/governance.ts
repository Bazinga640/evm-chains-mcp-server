import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { OS_GUIDANCE, CHAIN_GUIDANCE, SUPPORTED_CHAINS } from '../constants/guidance.js';

export const GOVERNANCE_TOOLS: Tool[] = [
    {
        name: 'evm_cast_vote',
        description: `
Cast votes in DAO governance proposals

Participate in on-chain governance for major protocols.
Supports Compound, Uniswap, Aave, Maker, and more.

SUPPORTED PROTOCOLS:
- Ethereum: Compound, Uniswap, Aave, Maker, ENS
- Polygon: QuickSwap, Aavegotchi, Balancer
- Avalanche: Pangolin, Benqi, TraderJoe
- BSC: PancakeSwap, Venus, Alpaca
- Arbitrum: ArbitrumDAO, GMX, Radiant

PARAMETERS:
- chain: Target blockchain
- protocol: Governance protocol
- proposalId: Proposal ID to vote on
- support: Vote direction (for/against/abstain)
- reason: On-chain reason for vote (optional)
- privateKey: Private key with voting power

Returns vote receipt, proposal stats, and quorum status.
`,
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                protocol: { type: 'string' },
                proposalId: { type: 'string' },
                support: { type: 'string', enum: ['for', 'against', 'abstain'] },
                reason: { type: 'string' },
                privateKey: { type: 'string' },
                delegateVotes: { type: 'boolean' }
            },
            required: ['chain', 'protocol', 'proposalId', 'support', 'privateKey']
        }
    }
];
