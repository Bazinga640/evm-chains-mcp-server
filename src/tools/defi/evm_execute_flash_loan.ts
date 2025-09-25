
import { ethers } from 'ethers';
import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';
import {
  FLASH_LOAN_PROVIDERS,
  getProviderInfo,
  needsVerification,
  type ChainName,
  type ProviderName
} from '../../config/defi-protocols.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  provider: z.enum(['aave', 'dydx', 'balancer', 'uniswapV3', 'venus', 'pancakeswap', 'benqi', 'quickswap', 'radiant', 'biswap']).optional(),
  asset: z.string().describe('Token address to borrow'),
  amount: z.string().describe('Amount to borrow in token units'),
  callbackContract: z.string().describe('Contract address that will receive and repay the loan'),
  callbackData: z.string().optional().describe('Encoded data to pass to callback contract'),
  privateKey: z.string().describe('Private key for signing transaction'),
  profitEstimate: z.string().optional().describe('Expected profit in token units')
});

export async function handleExecuteFlashLoan(args: z.infer<typeof inputSchema>) {
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);
    const wallet = new ethers.Wallet(validated.privateKey, provider);

    // Select flash loan provider
    const chainProviders = FLASH_LOAN_PROVIDERS[validated.chain];
    const selectedProvider: ProviderName = (validated.provider as ProviderName) ||
      (Object.keys(chainProviders)[0] as ProviderName);

    const providerInfo = getProviderInfo(validated.chain as ChainName, selectedProvider);

    if (!providerInfo || providerInfo.address === '0x0000000000000000000000000000000000000000') {
      const availableProviders = Object.keys(chainProviders).join(', ');
      throw new Error(
        `Flash loan provider ${selectedProvider} not available on ${validated.chain}. ` +
        `Available providers: ${availableProviders}. ` +
        `See documentation: ${providerInfo?.documentation || 'N/A'}`
      );
    }

    // Check if provider address needs verification (>90 days old)
    const verificationWarning = needsVerification(providerInfo) ? {
      message: `Flash loan provider ${selectedProvider} on ${validated.chain} was last verified ${Math.floor((Date.now() - new Date(providerInfo.verified).getTime()) / (1000 * 60 * 60 * 24))} days ago. Address may be outdated.`,
      verificationUrl: providerInfo.documentation,
      lastVerified: providerInfo.verified
    } : null;

    // Get token decimals
    const tokenContract = new ethers.Contract(
      validated.asset,
      ['function decimals() view returns (uint8)'],
      provider
    );
    const decimals = await tokenContract.decimals();

    // Calculate fee
    const borrowAmount = ethers.parseUnits(validated.amount, decimals);
    const fee: bigint = (borrowAmount * BigInt(Math.floor(providerInfo.fee * 100))) / 10000n;
    const totalRepayment = borrowAmount + fee;

    // Flash loan implementation varies by provider
    let flashLoanABI: string[];
    let flashLoanMethod: string;
    let flashLoanParams: any[];

    switch (selectedProvider) {
      case 'aave':
        flashLoanABI = [
          'function flashLoanSimple(address receiverAddress, address asset, uint256 amount, bytes calldata params, uint16 referralCode) returns (bool)'
        ];
        flashLoanMethod = 'flashLoanSimple';
        flashLoanParams = [
          validated.callbackContract,
          validated.asset,
          borrowAmount,
          validated.callbackData || '0x',
          0 // referral code
        ];
        break;

      case 'dydx':
        // dYdX flash loan (no fee!)
        flashLoanABI = [
          'function operate((address,uint256)[] calldata accounts, (uint8,uint256,uint256,uint256,uint256,address,uint256,bytes)[] calldata actions) external'
        ];
        flashLoanMethod = 'operate';
        // Complex dYdX params structure
        flashLoanParams = [
          [{ owner: wallet.address, number: 1 }],
          [{
            actionType: 2, // Withdraw
            accountIdx: 0,
            amount: borrowAmount,
            primaryMarketId: 0, // ETH market
            secondaryMarketId: 0,
            otherAddress: validated.callbackContract,
            primaryMarketAmount: 0,
            data: validated.callbackData || '0x'
          }]
        ];
        break;

      case 'balancer':
        flashLoanABI = [
          'function flashLoan(address recipient, address[] tokens, uint256[] amounts, bytes userData) external'
        ];
        flashLoanMethod = 'flashLoan';
        flashLoanParams = [
          validated.callbackContract,
          [validated.asset],
          [borrowAmount],
          validated.callbackData || '0x'
        ];
        break;

      case 'uniswapV3':
        flashLoanABI = [
          'function flash(address recipient, uint256 amount0, uint256 amount1, bytes calldata data) external'
        ];
        flashLoanMethod = 'flash';
        flashLoanParams = [
          validated.callbackContract,
          borrowAmount, // amount0
          0, // amount1
          validated.callbackData || '0x'
        ];
        break;

      default:
        // Generic flash loan interface
        flashLoanABI = [
          'function flashLoan(address receiver, address token, uint256 amount, bytes calldata data) external returns (bool)'
        ];
        flashLoanMethod = 'flashLoan';
        flashLoanParams = [
          validated.callbackContract,
          validated.asset,
          borrowAmount,
          validated.callbackData || '0x'
        ];
    }

    // Create contract instance
    const flashLoanContract = new ethers.Contract(
      providerInfo.address,
      flashLoanABI,
      wallet
    );

    // CRITICAL: Estimate gas to validate flash loan atomicity
    // If callback doesn't repay loan, estimateGas will revert
    let estimatedGas: bigint;
    try {
      estimatedGas = await flashLoanContract[flashLoanMethod].estimateGas(...flashLoanParams);
    } catch (estimateError: any) {
      throw new Error(
        `Flash loan pre-flight check failed. This usually means:\n` +
        `1. Callback contract doesn't implement correct interface\n` +
        `2. Callback contract doesn't approve repayment\n` +
        `3. Callback contract doesn't have sufficient funds to repay\n` +
        `Error: ${estimateError.message}`
      );
    }

    // Execute flash loan
    const tx = await flashLoanContract[flashLoanMethod](...flashLoanParams, {
      gasLimit: estimatedGas * 120n / 100n // Add 20% buffer
    });

    const receipt = await tx.wait();

    // CRITICAL: Validate transaction succeeded (status = 1)
    if (receipt.status !== 1) {
      throw new Error(
        `Flash loan transaction failed on-chain (status: ${receipt.status}). ` +
        `This indicates the callback contract failed to repay the loan. ` +
        `Transaction hash: ${receipt.hash}`
      );
    }

    // Calculate costs and profit
    const gasCost: bigint = BigInt(receipt.gasUsed) * (receipt.effectiveGasPrice ? BigInt(receipt.effectiveGasPrice) : (receipt.gasPrice ? BigInt(receipt.gasPrice) : 0n));
    const totalCost = fee + gasCost;
    const profitAfterFees = validated.profitEstimate
      ? ethers.parseUnits(validated.profitEstimate, decimals) - totalCost
      : 0n;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          provider: selectedProvider,
          transactionHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          status: receipt.status,
          borrowAmount: ethers.formatUnits(borrowAmount, decimals),
          fee: ethers.formatUnits(fee, decimals),
          feePercentage: `${providerInfo.fee}%`,
          totalRepayment: ethers.formatUnits(totalRepayment, decimals),
          gasUsed: receipt.gasUsed.toString(),
          gasCost: ethers.formatEther(gasCost),
          totalCost: ethers.formatUnits(totalCost, decimals),
          estimatedProfit: validated.profitEstimate ? ethers.formatUnits(profitAfterFees, decimals) : 'Unknown',
          message: 'Flash loan executed successfully - callback contract repaid the loan',
          atomicityValidated: true,
          ...(verificationWarning && { verificationWarning })
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
          provider: validated.provider,
          suggestion: 'Ensure callback contract is deployed and implements the correct interface for the provider'
        }, null, 2)
      }]
    };
  }
}