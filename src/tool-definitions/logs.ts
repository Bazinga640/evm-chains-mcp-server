import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { OS_GUIDANCE, CHAIN_GUIDANCE, SUPPORTED_CHAINS } from '../constants/guidance.js';

export const LOGS_TOOLS: Tool[] = [
  {
    name: 'evm_filter_logs',
    description: `
Filter and decode blockchain event logs

Query historical events from smart contracts with advanced filtering.
Automatically decodes common events like Transfer, Approval, Swap.

FEATURES:
- Filter by contract, topics, block range
- Automatic event decoding
- Support for event signatures
- Statistics and aggregation

PARAMETERS:
- chain: Target blockchain
- contractAddress: Contract to filter logs from
- topics: Event topics array (optional)
- fromBlock: Starting block
- toBlock: Ending block
- eventSignature: Event signature (optional)
- decodeData: Decode log data (default true)
- limit: Max logs to return (default 100)

Returns decoded events with timestamps and statistics.
`,
    inputSchema: {
      type: 'object',
      properties: {
        chain: { type: 'string', enum: SUPPORTED_CHAINS },
        contractAddress: { type: 'string' },
        topics: { type: 'array', items: { type: ['string', 'null'] } },
        fromBlock: { type: ['number', 'string'], default: 'latest' },
        toBlock: { type: ['number', 'string'], default: 'latest' },
        eventSignature: { type: 'string' },
        decodeData: { type: 'boolean', default: true },
        limit: { type: 'number', default: 100 }
      },
      required: ['chain', 'contractAddress']
    }
  }
];
