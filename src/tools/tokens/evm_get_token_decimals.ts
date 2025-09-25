/**
 * EVM Get Token Decimals Tool
 *
 * Get the number of decimals for an ERC-20 token
 */

import { z } from 'zod';
import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';
import { getErc20Contract } from '../../utils/erc20.js';
import { buildSuccessResponse, buildErrorResponse } from '../../utils/responses.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  tokenAddress: z.string().describe('ERC-20 token contract address')
});

// Minimal ERC-20 ABI for decimals() function
const ERC20_DECIMALS_ABI = [
  'function decimals() view returns (uint8)'
];

export async function handleGetTokenDecimals(args: z.infer<typeof inputSchema>) {
  const startTime = Date.now();
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);
    const contract = getErc20Contract(validated.tokenAddress, provider, ERC20_DECIMALS_ABI);
    const decimals = await contract.decimals();
    return buildSuccessResponse({
      chain: validated.chain,
      tokenAddress: validated.tokenAddress,
      decimals: Number(decimals),
      executionTime: `${Date.now() - startTime}ms`
    });
  } catch (error: any) {
    return buildErrorResponse({
      error: error.message,
      chain: validated.chain,
      tokenAddress: validated.tokenAddress,
      executionTime: `${Date.now() - startTime}ms`
    });
  }
}
