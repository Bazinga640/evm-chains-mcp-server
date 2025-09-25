/**
 * Send a transaction to a smart contract (write operation)
 */

import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

export async function handleSendContractTransaction(args: {
  chain: string;
  contractAddress: string;
  abi: any[];
  functionName: string;
  params?: any[];
  value?: string;
  privateKey: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    const config = clientManager.getChainConfig(args.chain);
    const provider = clientManager.getProvider(args.chain);
    const contractAddress = clientManager.getChecksumAddress(args.contractAddress);

    const wallet = new ethers.Wallet(args.privateKey, provider);
    const contract = new ethers.Contract(contractAddress, args.abi, wallet);

    // Send transaction
    const params = args.params || [];
    const options: any = {};
    if (args.value) {
      options.value = ethers.parseEther(args.value);
    }

    const tx = await contract[args.functionName](...params, options);

    const response = {
      success: true,
      chain: args.chain,
      network: config.name,
      contract: {
        address: contractAddress,
        function: args.functionName
      },
      transaction: {
        hash: tx.hash,
        from: wallet.address,
        status: 'pending',
        parameters: params,
        value: args.value || '0'
      },
      explorer: clientManager.getTransactionExplorerUrl(args.chain, tx.hash),
      executionTime: `${Date.now() - startTime}ms`
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  } catch (error: any) {
    const errorResponse = {
      success: false,
      error: error.message,
      chain: args.chain,
      timestamp: new Date().toISOString(),
      executionTime: `${Date.now() - startTime}ms`,
      troubleshooting: {
        'execution reverted': 'Transaction failed - check contract requirements',
        'insufficient funds': 'Not enough ETH for transaction',
        'function not found': 'Verify function exists in ABI'
      }
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(errorResponse, null, 2)
      }]
    };
  }
}
