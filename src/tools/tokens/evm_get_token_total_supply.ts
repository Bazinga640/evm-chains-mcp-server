/**
 * EVM Get Token Total Supply Tool
 *
 * Get the total supply of an ERC-20 token
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

// Minimal ERC-20 ABI for totalSupply() function
const ERC20_TOTAL_SUPPLY_ABI = [
  'function totalSupply() view returns (uint256)',
  'function decimals() view returns (uint8)'
];

export async function handleGetTokenTotalSupply(args: z.infer<typeof inputSchema>) {
  const startTime = Date.now();
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);
    const contract = getErc20Contract(validated.tokenAddress, provider, ERC20_TOTAL_SUPPLY_ABI);

    const [totalSupply, decimals] = await Promise.all([
      contract.totalSupply(),
      contract.decimals()
    ]);

    const formatted = ethers.formatUnits(totalSupply, decimals);

    return buildSuccessResponse({
      chain: validated.chain,
      tokenAddress: validated.tokenAddress,
      totalSupply: {
        raw: totalSupply.toString(),
        formatted
      },
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
