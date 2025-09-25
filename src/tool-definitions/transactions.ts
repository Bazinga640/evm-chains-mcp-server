import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { OS_GUIDANCE, CHAIN_GUIDANCE, SUPPORTED_CHAINS } from '../constants/guidance.js';

export const TRANSACTIONS_TOOLS: Tool[] = [
  // Note: evm_get_transaction, evm_get_transaction_history, and evm_send_transaction
  // are already included in CORE_TOOLS
];
