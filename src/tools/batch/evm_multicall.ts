import { ethers } from 'ethers';
import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

// Multicall3 contract addresses (deployed on most chains at same address)
const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  calls: z.array(z.object({
    target: z.string().describe('Contract address to call'),
    callData: z.string().describe('Encoded function call data'),
    allowFailure: z.boolean().optional().default(false).describe('Allow this call to fail')
  })).describe('Array of calls to execute'),
  requireSuccess: z.boolean().optional().default(true).describe('Require all calls to succeed'),
  gasLimit: z.string().optional().describe('Gas limit per call')
});

export async function handleMulticall(args: z.infer<typeof inputSchema>) {
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);

    // Multicall3 ABI
    const multicall3ABI = [
      'function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[])',
      'function tryAggregate(bool requireSuccess, tuple(address target, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[])',
      'function getBlockNumber() view returns (uint256)',
      'function getBlockHash(uint256 blockNumber) view returns (bytes32)',
      'function getCurrentBlockTimestamp() view returns (uint256)',
      'function getEthBalance(address addr) view returns (uint256)'
    ];

    const multicall = new ethers.Contract(MULTICALL3_ADDRESS, multicall3ABI, provider);

    // Format calls for Multicall3
    const formattedCalls = validated.calls.map(call => ({
      target: call.target,
      allowFailure: call.allowFailure,
      callData: call.callData
    }));

    // Execute multicall using staticCall for read-only operations
    // This prevents sending a transaction and uses eth_call instead
    const results = await multicall.aggregate3.staticCall(formattedCalls);

    // Process results
    interface ProcessedResult {
      index: number;
      target: string;
      success: boolean;
      returnData: string;
      decodedUint?: string;
      decodedAddress?: string;
      decodedBool?: boolean;
      error?: string;
    }

    const processedResults = results.map((result: { success: boolean; returnData: string }, index: number): ProcessedResult => {
      const call = validated.calls[index];

      const processedResult: ProcessedResult = {
        index,
        target: call.target,
        success: result.success,
        returnData: result.returnData
      };

      // Try to decode common return types
      if (result.success && result.returnData !== '0x') {
        try {
          // Try to decode as uint256
          if (result.returnData.length === 66) { // 0x + 64 hex chars
            processedResult.decodedUint = ethers.toBigInt(result.returnData).toString();
          }

          // Try to decode as address
          if (result.returnData.length === 66 && result.returnData.slice(0, 26) === '0x000000000000000000000000') {
            processedResult.decodedAddress = ethers.getAddress('0x' + result.returnData.slice(26));
          }

          // Try to decode as bool
          if (result.returnData === '0x0000000000000000000000000000000000000000000000000000000000000001') {
            processedResult.decodedBool = true;
          } else if (result.returnData === '0x0000000000000000000000000000000000000000000000000000000000000000') {
            processedResult.decodedBool = false;
          }
        } catch (e) {
          // Decoding failed, keep raw data
        }
      }

      if (!result.success) {
        processedResult.error = 'Call reverted';
        if (!call.allowFailure && validated.requireSuccess) {
          throw new Error(`Call ${index} to ${call.target} failed`);
        }
      }

      return processedResult;
    });

    // Calculate statistics
    const successCount = processedResults.filter((r: ProcessedResult) => r.success).length;
    const failureCount = processedResults.filter((r: ProcessedResult) => !r.success).length;

    // Get block info using staticCall (view functions)
    const blockNumber = await multicall.getBlockNumber.staticCall();
    const blockTimestamp = await multicall.getCurrentBlockTimestamp.staticCall();

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          multicallAddress: MULTICALL3_ADDRESS,
          totalCalls: validated.calls.length,
          successfulCalls: successCount,
          failedCalls: failureCount,
          blockNumber: blockNumber.toString(),
          blockTimestamp: blockTimestamp.toString(),
          timestamp: new Date(Number(blockTimestamp) * 1000).toISOString(),
          results: processedResults,
          gasEfficiency: `Batched ${validated.calls.length} calls into single eth_call (no gas cost)`,
          note: 'All calls executed atomically using staticCall (read-only, no transaction sent)'
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error.message,
          chain: validated.chain,
          suggestion: 'Check that all contract addresses and call data are correct'
        }, null, 2)
      }]
    };
  }
}