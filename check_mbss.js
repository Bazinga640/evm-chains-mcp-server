const handlers = require('./build/tool-handlers.js');
const keys = Object.keys(handlers.TOOL_HANDLERS);
const mbssTools = [
  'evm_get_chain_info', 'evm_get_balance', 'evm_get_transaction', 'evm_get_block', 'evm_validate_address',
  'evm_get_transaction_history', 'evm_send_transaction',
  'evm_create_wallet', 'evm_import_wallet', 'evm_generate_address', 'evm_get_wallet_info',
  'evm_get_network_info', 'evm_get_gas_price', 'evm_estimate_fees', 'evm_get_mempool_info',
  'evm_get_account_info',
  'evm_get_token_balance', 'evm_get_token_info', 'evm_transfer_token', 'evm_approve_token', 'evm_get_token_allowance',
  'evm_help', 'evm_search_tools', 'evm_list_tools_by_category'
];
const missing = mbssTools.filter(t => !keys.includes(t));
const found = mbssTools.filter(t => keys.includes(t));
console.log('MBSS Tools Found:', found.length + '/24');
if (missing.length > 0) {
  console.log('Missing:', missing.join(', '));
} else {
  console.log('✅ ALL 24 MANDATORY TOOLS PRESENT');
}
