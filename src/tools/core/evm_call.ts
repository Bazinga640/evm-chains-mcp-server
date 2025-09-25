/**
 * EVM Call Tool
 *
 * Execute a read-only contract call without creating a transaction
 */

import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  to: z.string().describe('Contract address'),
  data: z.string().describe('Encoded function call data'),
  from: z.string().optional().describe('Sender address (optional)'),
  value: z.string().optional().describe('Value to send in wei'),
  blockTag: z.string().optional().describe('Block number or "latest"')
});

export async function handleCall(args: z.infer<typeof inputSchema>) {
  const startTime = Date.now();
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);

    // Build transaction object (don't include blockTag in transaction)
    const transaction: any = {
      to: validated.to,
      data: validated.data
    };

    if (validated.from) transaction.from = validated.from;
    if (validated.value) transaction.value = validated.value;

    // Call the contract
    const result = await provider.call(transaction);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          result,
          resultInfo: {
            isEmpty: result === '0x',
            bytesLength: result === '0x' ? 0 : (result.length - 2) / 2,
            note: result === '0x'
              ? 'Empty return data - function may return void, the call reverted silently, or contract not found'
              : 'Raw hex data returned. Use evm_decode_contract_data to decode if needed, or use evm_call_contract for automatic decoding.'
          },
          transaction,
          blockTag: validated.blockTag || 'latest',
          usage: {
            rawCall: 'This tool returns raw hex bytes from the contract call',
            decoding: 'For automatic decoding, use evm_call_contract with ABI instead',
            manualDecode: 'To decode result manually, use evm_decode_contract_data with ABI'
          },
          executionTime: `${Date.now() - startTime}ms`
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error.message,
          chain: validated.chain,
          transaction: {
            to: validated.to,
            data: validated.data
          },
          executionTime: `${Date.now() - startTime}ms`
        }, null, 2)
      }]
    };
  }
}
