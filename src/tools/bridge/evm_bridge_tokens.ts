import { ethers } from 'ethers';
import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

// Bridge contracts by chain
const BRIDGE_CONTRACTS: Record<string, Record<string, string>> = {
  ethereum: {
    polygon: '0xA0c68C638235ee32657e8f720a23ceC1bFc77C77', // Polygon Bridge
    arbitrum: '0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f', // Arbitrum Bridge
    optimism: '0x99C9fc46f92E8a1c0deC1b1747d010903E884bE1', // Optimism Bridge
    base: '0x3154Cf16ccdb4C6d922629664174b904d80F2C35', // Base Bridge
  },
  polygon: {
    ethereum: '0x2890bA17EfE978480615e330ecB65333b880928e', // Back to Ethereum
    avalanche: '0x5c231372550F0E39B3900d2fD4563f88398736a7', // To Avalanche
  },
  avalanche: {
    ethereum: '0x8EB8a3b98659Cce290402893d0123abb75E3ab28', // Avalanche Bridge
    polygon: '0xE78388b4CE79068e89Bf8Aa7f218eF6b9AB0e9d0',
  },
  bsc: {
    ethereum: '0x4aa42145Aa6Ebf72e164C9bBC74fbD3788045016', // Binance Bridge
    polygon: '0x5a58505a96D1dbf8dF91cB21B54419FC36e93fdE',
  },
  arbitrum: {
    ethereum: '0x0B9857ae2D4A3DBe74ffE1d7DF045bb7F96E4840', // Arbitrum L1 Gateway
    optimism: '0x10E6593CDda8c58a1d0f14C5164B376352a55f2F', // Cross-rollup bridge
  },
  base: {
    ethereum: '0x3154Cf16ccdb4C6d922629664174b904d80F2C35', // Base Bridge
    optimism: '0x4200000000000000000000000000000000000010', // Standard Bridge
  },
  worldchain: {
    ethereum: '0x0000000000000000000000000000000000000000', // Placeholder
    base: '0x0000000000000000000000000000000000000000',
  }
};

const inputSchema = z.object({
  sourceChain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  targetChain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  token: z.string().describe('Token address to bridge'),
  amount: z.string().describe('Amount to bridge'),
  recipient: z.string().optional().describe('Recipient address on target chain'),
  privateKey: z.string().describe('Private key for signing'),
  slippage: z.number().optional().default(0.5).describe('Slippage tolerance in %'),
  gasPrice: z.string().optional().describe('Custom gas price in gwei')
});

export async function handleBridgeTokens(args: z.infer<typeof inputSchema>) {
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const sourceProvider = clientManager.getProvider(validated.sourceChain);
    const wallet = new ethers.Wallet(validated.privateKey, sourceProvider);

    const recipient = validated.recipient || wallet.address;
    const bridgeAddress = BRIDGE_CONTRACTS[validated.sourceChain]?.[validated.targetChain];

    if (!bridgeAddress || bridgeAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error(`Bridge not available from ${validated.sourceChain} to ${validated.targetChain}`);
    }

    // Bridge ABI (simplified - varies by bridge)
    const bridgeABI = [
      'function depositERC20(address token, address to, uint256 amount, uint256 maxGas, uint256 gasPriceBid) payable',
      'function deposit(address token, address to, uint256 amount) payable',
      'function bridgeToken(address token, uint256 amount, uint256 destinationChainId, address recipient) payable',
      'function outboundTransfer(address token, address to, uint256 amount, bytes calldata data) payable'
    ];

    const bridgeContract = new ethers.Contract(bridgeAddress, bridgeABI, wallet);

    // First approve token for bridge
    const tokenContract = new ethers.Contract(
      validated.token,
      ['function approve(address spender, uint256 amount) returns (bool)'],
      wallet
    );

    const amountWei = ethers.parseEther(validated.amount);

    // Approve bridge to spend tokens
    const approveTx = await tokenContract.approve(bridgeAddress, amountWei);
    await approveTx.wait();

    // Calculate bridge fees (varies by bridge)
    const bridgeFee = ethers.parseEther('0.001'); // Example fee

    // Execute bridge transaction
    let bridgeTx;

    // Different bridges have different methods
    if (validated.sourceChain === 'arbitrum') {
      // Arbitrum specific bridging
      const maxGas = 1000000n;
      const gasPriceBid = ethers.parseUnits('0.1', 'gwei');

      bridgeTx = await bridgeContract.depositERC20(
        validated.token,
        recipient,
        amountWei,
        maxGas,
        gasPriceBid,
        { value: bridgeFee }
      );
    } else if (validated.sourceChain === 'polygon') {
      // Polygon bridge
      bridgeTx = await bridgeContract.deposit(
        validated.token,
        recipient,
        amountWei,
        { value: bridgeFee }
      );
    } else {
      // Generic bridge method
      const targetChainId = {
        ethereum: 1,
        polygon: 137,
        avalanche: 43114,
        bsc: 56,
        arbitrum: 42161,
        base: 8453,
        worldchain: 999999
      }[validated.targetChain];

      bridgeTx = await bridgeContract.bridgeToken(
        validated.token,
        amountWei,
        targetChainId,
        recipient,
        { value: bridgeFee }
      );
    }

    const receipt = await bridgeTx.wait();

    // Estimate arrival time
    const estimatedTime: Record<string, string> = {
      'ethereum-polygon': '20-30 minutes',
      'ethereum-arbitrum': '10-15 minutes',
      'ethereum-base': '2-5 minutes',
      'polygon-ethereum': '3-4 hours (checkpoint)',
      'arbitrum-ethereum': '7 days (challenge period)',
      'base-ethereum': '2 hours (finality)',
      default: '15-60 minutes'
    };

    const routeKey = `${validated.sourceChain}-${validated.targetChain}`;
    const arrivalTime = estimatedTime[routeKey] || estimatedTime.default;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          sourceChain: validated.sourceChain,
          targetChain: validated.targetChain,
          token: validated.token,
          amount: validated.amount,
          recipient,
          bridgeContract: bridgeAddress,
          transactionHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          bridgeFee: ethers.formatEther(bridgeFee),
          estimatedArrival: arrivalTime,
          status: 'Bridge initiated - tokens in transit',
          tracking: `Monitor on ${validated.targetChain} explorer for arrival`,
          note: 'Save transaction hash to track bridge status'
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error.message,
          sourceChain: validated.sourceChain,
          targetChain: validated.targetChain,
          suggestion: 'Ensure you have sufficient balance for token amount and bridge fees'
        }, null, 2)
      }]
    };
  }
}