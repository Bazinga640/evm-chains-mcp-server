import { TOOL_HANDLERS } from '../../../src/tool-handlers';

describe('EVM Chains MCP Server Tests', () => {
  it('should have exactly 113 tools', () => {
    expect(Object.keys(TOOL_HANDLERS).length).toBe(113);
  });

  it('should have critical sentinel tools', () => {
    const criticalTools = [
      'evm_get_balance',
      'evm_send_transaction',
      'evm_transfer_token',
      'evm_deploy_token',
      'evm_mint_nft',
      'evm_get_dex_quote',
      'evm_sign_message',
      'evm_create_nft_with_ipfs',
      'evm_create_wallet',
      'evm_call_contract'
    ];

    const handlerNames = Object.keys(TOOL_HANDLERS);
    criticalTools.forEach(tool => {
      expect(handlerNames).toContain(tool);
    });
  });
});
