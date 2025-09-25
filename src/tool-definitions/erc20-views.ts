import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { OS_GUIDANCE, CHAIN_GUIDANCE, SUPPORTED_CHAINS } from '../constants/guidance.js';

export const ERC20_VIEWS_TOOLS: Tool[] = [
    {
        name: 'evm_get_token_decimals',
        description: 'Get the number of decimals for an ERC-20 token',
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                tokenAddress: { type: 'string', description: 'ERC-20 token contract address' }
            },
            required: ['chain', 'tokenAddress']
        }
    },
    {
        name: 'evm_get_token_name',
        description: 'Get the name of an ERC-20 token',
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                tokenAddress: { type: 'string', description: 'ERC-20 token contract address' }
            },
            required: ['chain', 'tokenAddress']
        }
    },
    {
        name: 'evm_get_token_symbol',
        description: 'Get the symbol of an ERC-20 token',
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                tokenAddress: { type: 'string', description: 'ERC-20 token contract address' }
            },
            required: ['chain', 'tokenAddress']
        }
    },
    {
        name: 'evm_get_token_total_supply',
        description: 'Get the total supply of an ERC-20 token',
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                tokenAddress: { type: 'string', description: 'ERC-20 token contract address' }
            },
            required: ['chain', 'tokenAddress']
        }
    }
];
