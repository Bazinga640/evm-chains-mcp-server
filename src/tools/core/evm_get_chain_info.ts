/**
 * EVM Get Chain Info Tool
 *
 * Get detailed information about one or all supported EVM chains
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

const clientManager = getClientManager();

export async function handleGetChainInfo(args: { chain: string }) {
  const startTime = Date.now();

  try {
    if (args.chain === 'all') {
      // Return info for all chains
      const chains = clientManager.getSupportedChains();
      const chainInfos = await Promise.all(
        chains.map(async (chain) => {
          const config = clientManager.getChainConfig(chain);
          const isConnected = await clientManager.testConnection(chain);
          const blockNumber = isConnected ? await clientManager.getBlockNumber(chain) : null;

          return {
            chain,
            name: config.name,
            chainId: config.chainId,
            nativeToken: config.nativeToken,
            rpcUrl: config.rpcUrl,
            explorer: config.explorer,
            testnet: config.testnet,
            connected: isConnected,
            currentBlock: blockNumber
          };
        })
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            totalChains: chainInfos.length,
            chains: chainInfos,
            executionTime: `${Date.now() - startTime}ms`
          }, null, 2)
        }]
      };
    } else {
      // Return info for specific chain
      if (!clientManager.isChainSupported(args.chain)) {
        throw new Error(`Unsupported chain: ${args.chain}`);
      }

      const config = clientManager.getChainConfig(args.chain);
      const isConnected = await clientManager.testConnection(args.chain);
      const blockNumber = isConnected ? await clientManager.getBlockNumber(args.chain) : null;
      const gasPrice = isConnected ? await clientManager.getGasPrice(args.chain) : null;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            chain: args.chain,
            name: config.name,
            chainId: config.chainId,
            nativeToken: config.nativeToken,
            rpcUrl: config.rpcUrl,
            explorer: config.explorer,
            testnet: config.testnet,
            connected: isConnected,
            currentBlock: blockNumber,
            gasPrice: gasPrice ? ethers.formatUnits(gasPrice, 'gwei') + ' gwei' : null,
            executionTime: `${Date.now() - startTime}ms`
          }, null, 2)
        }]
      };
    }
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error.message,
          chain: args.chain,
          executionTime: `${Date.now() - startTime}ms`
        }, null, 2)
      }]
    };
  }
}
