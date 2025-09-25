import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { OS_GUIDANCE, CHAIN_GUIDANCE, SUPPORTED_CHAINS } from '../constants/guidance.js';

export const CHAIN_INFO_TOOLS: Tool[] = [
  // Note: evm_get_chain_info, evm_get_chain_id, and evm_get_network_status
  // are already included in CORE_TOOLS, JSON_RPC_TOOLS, and NETWORK_GAS_TOOLS respectively
];
