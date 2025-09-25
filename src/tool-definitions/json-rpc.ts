import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { OS_GUIDANCE, CHAIN_GUIDANCE, SUPPORTED_CHAINS } from '../constants/guidance.js';

export const JSON_RPC_TOOLS: Tool[] = [
    {
        name: 'evm_get_block_number',
        description: 'Get the latest block number from the blockchain',
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS }
            },
            required: ['chain']
        }
    },
    {
        name: 'evm_get_chain_id',
        description: 'Get the chain ID for the specified blockchain',
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS }
            },
            required: ['chain']
        }
    },
    {
        name: 'evm_get_code',
        description: 'Get the bytecode of a smart contract at a given address',
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                address: { type: 'string', description: 'Contract address' },
                blockTag: { type: 'string', description: 'Block number or "latest"' }
            },
            required: ['chain', 'address']
        }
    },
    {
        name: 'evm_get_storage_at',
        description: 'Get the value from a contract storage slot',
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                address: { type: 'string', description: 'Contract address' },
                position: { type: ['string', 'number'], description: 'Storage slot position' },
                blockTag: { type: 'string', description: 'Block number or "latest"' }
            },
            required: ['chain', 'address', 'position']
        }
    },
    {
        name: 'evm_get_logs',
        description: 'Query event logs from the blockchain with filtering',
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                address: { type: ['string', 'array'], description: 'Contract address(es) to filter' },
                topics: { type: 'array', description: 'Event topics to filter' },
                fromBlock: { type: ['number', 'string'], description: 'Starting block number or tag' },
                toBlock: { type: ['number', 'string'], description: 'Ending block number or tag' }
            },
            required: ['chain']
        }
    },
    {
        name: 'evm_get_transaction_count',
        description: 'Get the number of transactions sent from an address (nonce)',
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                address: { type: 'string', description: 'Address to check' },
                blockTag: { type: 'string', description: 'Block number or "latest", "earliest", "pending"' }
            },
            required: ['chain', 'address']
        }
    },
    {
        name: 'evm_get_transaction_receipt',
        description: 'Get the receipt of a mined transaction',
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                txHash: { type: 'string', description: 'Transaction hash' }
            },
            required: ['chain', 'txHash']
        }
    },
    {
        name: 'evm_get_fee_history',
        description: 'Get historical gas fee data for EIP-1559 chains',
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                blockCount: { type: 'number', description: 'Number of blocks to analyze', default: 10 },
                newestBlock: { type: ['string', 'number'], description: 'Starting block', default: 'latest' },
                rewardPercentiles: { type: 'array', description: 'Percentiles for priority fee analysis' }
            },
            required: ['chain']
        }
    },
    {
        name: 'evm_call',
        description: 'Execute a read-only contract call without creating a transaction',
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                to: { type: 'string', description: 'Contract address' },
                data: { type: 'string', description: 'Encoded function call data' },
                from: { type: 'string', description: 'Sender address (optional)' },
                value: { type: 'string', description: 'Value to send in wei' },
                blockTag: { type: 'string', description: 'Block number or "latest"' }
            },
            required: ['chain', 'to', 'data']
        }
    }
];
