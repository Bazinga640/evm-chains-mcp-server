import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  protocol: z.string().describe('Governance protocol (compound, uniswap, aave, etc.)'),
  proposalId: z.string().describe('Proposal ID to vote on'),
  support: z.enum(['for', 'against', 'abstain']).describe('Vote direction'),
  reason: z.string().optional().describe('Reason for vote (on-chain)'),
  privateKey: z.string().describe('Private key for voting'),
  delegateVotes: z.boolean().optional().describe('Delegate voting power first')
});

export async function handleCastVote(args: z.infer<typeof inputSchema>) {
  const validated = inputSchema.parse(args);
  const clientManager = getClientManager();

  // Voting contracts referenced by this tool only exist on mainnet, so block execution here.
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: false,
        error: 'Governance voting tools are disabled on the testnet MCP server.',
        reason: 'DAO governance contracts (Compound, Uniswap, Aave, GMX, etc.) only run on mainnet. Broadcasting votes from testnet would always fail.',
        chain: validated.chain,
        environment: 'testnet',
        guidance: [
          'Use the mainnet EVM Chains MCP server to participate in on-chain governance.',
          'For local experimentation, deploy mock Governor contracts and invoke them via evm_send_contract_transaction.'
        ],
        supportedChains: clientManager.getSupportedChains()
      }, null, 2)
    }]
  };
}
