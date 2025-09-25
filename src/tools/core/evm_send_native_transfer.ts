import { ethers } from 'ethers';
import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  toAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address').describe('Recipient address (0x...)'),
  amount: z.string().describe('Amount to send in native token units (e.g., "0.01")'),
  privateKey: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid private key').describe('Sender private key (0x...)'),
});

export async function handleSendNativeTransfer(args: z.infer<typeof inputSchema>) {
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);
    const chainId = (await provider.getNetwork()).chainId;

    const wallet = new ethers.Wallet(validated.privateKey, provider);

    // Get sender's address from private key
    const fromAddress = wallet.address;

    // Convert amount to wei
    const amountWei = ethers.parseEther(validated.amount);

    // Get current nonce
    const nonce = await provider.getTransactionCount(fromAddress, 'latest');

    // Get gas price
    let gasPrice: bigint;
    let maxFeePerGas: bigint | undefined;
    let maxPriorityFeePerGas: bigint | undefined;

    const feeData = await provider.getFeeData();

    if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
      // EIP-1559
      maxFeePerGas = feeData.maxFeePerGas;
      maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
      gasPrice = maxFeePerGas; // For gas limit estimation
    } else if (feeData.gasPrice) {
      // Legacy
      gasPrice = feeData.gasPrice;
    } else {
      throw new Error('Could not retrieve gas price or fee data.');
    }

    // Estimate gas limit
    const estimatedGasLimit = await provider.estimateGas({
      from: fromAddress,
      to: validated.toAddress,
      value: amountWei,
      data: '0x', // Native transfer has no data
    });

    // Add a buffer to the estimated gas limit
    const gasLimit = estimatedGasLimit + (estimatedGasLimit / 10n); // 10% buffer

    // Construct transaction object
    const transaction = {
      to: validated.toAddress,
      value: amountWei,
      nonce: nonce,
      chainId: chainId,
      gasLimit: gasLimit,
      ...(maxFeePerGas && maxPriorityFeePerGas ? { maxFeePerGas, maxPriorityFeePerGas } : { gasPrice }),
    };

    // Sign the transaction
    const signedTransaction = await wallet.signTransaction(transaction);

    // Send the signed transaction
    const txResponse = await provider.broadcastTransaction(signedTransaction);

    // Wait for transaction receipt (optional, but good for confirmation)
    const receipt = await txResponse.wait();

    if (!receipt || receipt.status !== 1) {
      throw new Error(`Transaction failed: ${receipt?.hash || 'No receipt hash'}`);
    }

    const response = {
      success: true,
      chain: validated.chain,
      from: fromAddress,
      to: validated.toAddress,
      amount: validated.amount,
      transactionHash: receipt.hash,
      gasUsed: receipt.gasUsed.toString(),
      blockNumber: receipt.blockNumber,
      explorerUrl: clientManager.getTransactionExplorerUrl(validated.chain, receipt.hash),
      message: 'Native token transfer successful',
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
      chain: validated.chain,
      from: new ethers.Wallet(validated.privateKey).address, // Get from address even if tx fails
      to: validated.toAddress,
      amount: validated.amount,
      error: error.message,
      suggestion: 'Check sender balance, recipient address, and network status.',
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(errorResponse, null, 2)
      }]
    };
  }
}
