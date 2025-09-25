import { ethers } from 'ethers';
import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';
import { buildJsonResponse } from '../../utils/responses.js';

const FLASHBOTS_RELAY = 'https://relay-sepolia.flashbots.net';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  transaction: z.object({
    to: z.string(),
    value: z.string().optional(),
    data: z.string().optional(),
    gasLimit: z.string().optional(),
    maxFeePerGas: z.string().optional(),
    maxPriorityFeePerGas: z.string().optional()
  }),
  privateKey: z.string().describe('Private key for signing'),
  targetBlock: z.number().optional().describe('Target block number for inclusion'),
  maxBlockNumber: z.number().optional().describe('Maximum block number for inclusion'),
  minTimestamp: z.number().optional().describe('Minimum timestamp for inclusion'),
  hints: z.array(z.string()).optional().describe('Transaction hints for builders')
});

export async function handleSendPrivateTransaction(args: z.infer<typeof inputSchema>) {
  const validated = inputSchema.parse(args);

  if (validated.chain !== 'ethereum') {
    return buildJsonResponse({
      success: false,
      error: 'Private transaction relays are only available on Ethereum (Sepolia) in this server.',
      chain: validated.chain,
      supportedChains: ['ethereum'],
      note: 'Use the public RPC with competitive fees for other chains or deploy your own private relay.'
    });
  }

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider('ethereum');
    const wallet = new ethers.Wallet(validated.privateKey, provider);

    const network = await provider.getNetwork();
    const tx: any = {
      to: validated.transaction.to,
      from: wallet.address,
      value: validated.transaction.value ? ethers.parseEther(validated.transaction.value) : 0n,
      data: validated.transaction.data || '0x',
      chainId: Number(network.chainId),
      type: 2
    };

    if (validated.transaction.maxFeePerGas) {
      tx.maxFeePerGas = ethers.parseUnits(validated.transaction.maxFeePerGas, 'gwei');
    }
    if (validated.transaction.maxPriorityFeePerGas) {
      tx.maxPriorityFeePerGas = ethers.parseUnits(validated.transaction.maxPriorityFeePerGas, 'gwei');
    }
    if (validated.transaction.gasLimit) {
      tx.gasLimit = BigInt(validated.transaction.gasLimit);
    }

    tx.nonce = await provider.getTransactionCount(wallet.address, 'pending');
    const signedTx = await wallet.signTransaction(tx);

    const currentBlock = await provider.getBlockNumber();
    const targetBlock = validated.targetBlock || currentBlock + 1;
    const maxBlock = validated.maxBlockNumber || targetBlock + 10;

    const simulationRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_callBundle',
      params: [{
        txs: [signedTx],
        blockNumber: ethers.toQuantity(targetBlock),
        stateBlockNumber: ethers.toQuantity(currentBlock),
        timestamp: Math.floor(Date.now() / 1000)
      }]
    };

    const simulation = await sendFlashbotsRequest(simulationRequest, wallet);
    if (simulation.error) {
      return buildJsonResponse({
        success: false,
        error: 'Simulation failed',
        details: simulation.error,
        chain: validated.chain,
        suggestion: 'Transaction is expected to revert. Check calldata/value/gas.'
      });
    }

    const bundleRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_sendBundle',
      params: [{
        txs: [signedTx],
        blockNumber: ethers.toQuantity(targetBlock),
        minTimestamp: validated.minTimestamp || 0,
        maxTimestamp: validated.minTimestamp ? validated.minTimestamp + 120 : 0,
        revertingTxHashes: [],
        replacementUuid: ethers.id(signedTx)
      }]
    };

    const bundle = await sendFlashbotsRequest(bundleRequest, wallet);
    if (bundle.error) {
      return buildJsonResponse({
        success: false,
        error: 'Bundle submission failed',
        details: bundle.error,
        chain: validated.chain,
        suggestion: 'Check relay status and ensure transaction is profitable for builders.'
      });
    }

    return buildJsonResponse({
      success: true,
      chain: validated.chain,
      bundleHash: bundle.result?.bundleHash || 'pending',
      simulationResult: {
        success: !simulation.error,
        gasUsed: simulation.result?.totalGasUsed || 'unknown',
        effectiveGasPrice: simulation.result?.effectiveGasPrice || 'unknown'
      },
      targetBlock,
      maxBlock,
      relay: FLASHBOTS_RELAY,
      note: 'Bundle inclusion is not guaranteed; monitor with evm_get_transaction once included.'
    });
  } catch (error: any) {
    return buildJsonResponse({
      error: error.message,
      chain: validated.chain,
      suggestion: 'Ensure transaction parameters are valid and the account has sufficient balance.'
    });
  }
}

async function sendFlashbotsRequest(
  body: Record<string, any>,
  wallet: ethers.Wallet
) {
  const payload = JSON.stringify(body);
  const signature = await signFlashbotsPayload(payload, wallet);

  const response = await fetch(FLASHBOTS_RELAY, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Flashbots-Signature': `${wallet.address}:${signature}`
    },
    body: payload
  });

  return response.json();
}

async function signFlashbotsPayload(payload: string, wallet: ethers.Wallet) {
  const hash = ethers.keccak256(ethers.toUtf8Bytes(payload));
  const rawSig = wallet.signingKey.sign(ethers.getBytes(hash));
  return ethers.Signature.from(rawSig).serialized;
}
