import { ethers } from 'ethers';
import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

// Sablier V2 contract addresses (audited protocol)
const SABLIER_CONTRACTS: Record<string, { linear: string, dynamic: string }> = {
  ethereum: {
    linear: '0xAFb979d9afAd1aD27C5eFf4E27226E3AB9e5dCC9',
    dynamic: '0x9DeaBf7815b42Bf4E9a03EEc35a486fF74ee7459'
  },
  polygon: {
    linear: '0x67422c3E36A908d5c3237e9cFFeb40bDE7060F6e',
    dynamic: '0x3962f6585946823440d274aD7C719B02b49DE51E'
  },
  arbitrum: {
    linear: '0xFDD9d122B451F549f48c4942c6fa6646D849e8C1',
    dynamic: '0x6f68516c21E248cdDfaf4898e66b2b0Adee0e0d6'
  },
  optimism: {
    linear: '0x4b45090152a5731b5bc71b5baF71E60e05B33867',
    dynamic: '0xf900c5E3aA95B59Cc976e6bc9c0998618729a5fa'
  },
  base: {
    linear: '0xFCF737582d167c7D20A336532eb8BCcA8CF8e350',
    dynamic: '0x645b00960Dc352e699f89a81F681BAac36e1dc20'
  },
  avalanche: {
    linear: '0x0000000000000000000000000000000000000000',
    dynamic: '0x0000000000000000000000000000000000000000'
  },
  bsc: {
    linear: '0x3Fe4333f62A75c2a85C8211c6FEaf66527E5f6e0',
    dynamic: '0xf2f3FEF2454dCD59a52BF4b4a0a1cEb6Eb3114f0'
  },
  worldchain: {
    linear: '0x0000000000000000000000000000000000000000',
    dynamic: '0x0000000000000000000000000000000000000000'
  }
};

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  streamType: z.enum(['linear', 'dynamic']).default('linear').describe('Linear (constant) or dynamic (custom curve)'),
  token: z.string().describe('ERC20 token address to stream'),
  recipient: z.string().describe('Address receiving the stream'),
  totalAmount: z.string().describe('Total amount to stream'),
  duration: z.number().describe('Stream duration in seconds'),
  startTime: z.number().optional().describe('Unix timestamp to start (default: now)'),
  cliffDuration: z.number().optional().default(0).describe('Cliff period in seconds'),
  cancelable: z.boolean().optional().default(true).describe('Can sender cancel stream'),
  transferable: z.boolean().optional().default(true).describe('Can recipient transfer stream'),
  privateKey: z.string().describe('Private key for transaction'),
  streamingContract: z.string().optional().describe('Streaming contract address (optional)')
});

export async function handleCreateTokenStream(args: z.infer<typeof inputSchema>) {
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);
    const wallet = new ethers.Wallet(validated.privateKey, provider);

    let sablierAddress = validated.streamType === 'linear' ?
      SABLIER_CONTRACTS[validated.chain]?.linear :
      SABLIER_CONTRACTS[validated.chain]?.dynamic;

    // Allow override via provided streamingContract
    if (validated.streamingContract) {
      if (!ethers.isAddress(validated.streamingContract)) {
        throw new Error('Invalid streamingContract address');
      }
      sablierAddress = validated.streamingContract;
    }

    if (!sablierAddress || sablierAddress === '0x0000000000000000000000000000000000000000') {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: `Sablier ${validated.streamType} streams not available on ${validated.chain}`,
            availableChains: Object.keys(SABLIER_CONTRACTS).filter(
              chain => SABLIER_CONTRACTS[chain][validated.streamType] !== '0x0000000000000000000000000000000000000000'
            ),
            alternative: 'Use one of the supported chains or deploy custom streaming contract'
          }, null, 2)
        }]
      };
    }

    // Sablier Linear Lockup ABI
    const sablierABI = [
      'function createWithDurations((address sender, address recipient, uint128 totalAmount, address asset, bool cancelable, bool transferable, (uint40 cliff, uint40 duration) durations, (address brokerAccount, uint256 brokerFee) broker)) external returns (uint256 streamId)',
      'function withdraw(uint256 streamId, address to, uint128 amount) external',
      'function cancel(uint256 streamId) external',
      'function getStream(uint256 streamId) view returns (tuple)',
      'function withdrawableAmountOf(uint256 streamId) view returns (uint128)',
      'function streamedAmountOf(uint256 streamId) view returns (uint128)'
    ];

    const sablier = new ethers.Contract(sablierAddress, sablierABI, wallet);

    // Get token contract for approval
    const tokenContract = new ethers.Contract(
      validated.token,
      [
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)',
        'function approve(address spender, uint256 amount) returns (bool)',
        'function balanceOf(address) view returns (uint256)'
      ],
      wallet
    );

    const [decimals, symbol, balance] = await Promise.all([
      tokenContract.decimals(),
      tokenContract.symbol(),
      tokenContract.balanceOf(wallet.address)
    ]);

    const totalAmountWei = ethers.parseUnits(validated.totalAmount, decimals);

    // Check balance
    if (balance < totalAmountWei) {
      throw new Error(`Insufficient balance. Have: ${ethers.formatUnits(balance, decimals)}, Need: ${validated.totalAmount}`);
    }

    // Approve Sablier to spend tokens
    const approveTx = await tokenContract.approve(sablierAddress, totalAmountWei);
    await approveTx.wait();

    // Calculate start time
    const startTime = validated.startTime || Math.floor(Date.now() / 1000);
    const endTime = startTime + validated.duration;

    // Create stream parameters
    const streamParams = {
      sender: wallet.address,
      recipient: validated.recipient,
      totalAmount: totalAmountWei,
      asset: validated.token,
      cancelable: validated.cancelable,
      transferable: validated.transferable,
      durations: {
        cliff: validated.cliffDuration,
        duration: validated.duration
      },
      broker: {
        brokerAccount: ethers.ZeroAddress,
        brokerFee: 0
      }
    };

    // Create stream
    const createTx = await sablier.createWithDurations(streamParams);
    const receipt = await createTx.wait();

    // Extract stream ID from events
    let streamId = 0n;
    for (const log of receipt.logs) {
      try {
        // CreateLockupLinearStream event
        if (log.topics[0] === '0x5e3c1311ea442664e8b1611bfabef659120ea7a0a2cfc0667700bebc69cbffe1') {
          streamId = ethers.toBigInt(log.topics[1]);
          break;
        }
      } catch (e) {
        // Continue searching
      }
    }

    // Calculate streaming rate
    const totalAmountDecimal = parseFloat(ethers.formatUnits(totalAmountWei, decimals));
    const ratePerSecond = totalAmountDecimal / validated.duration;
    const ratePerDay = (ratePerSecond * 86400).toFixed(decimals);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          streamId: streamId.toString(),
          sablierContract: sablierAddress,
          transactionHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          streamDetails: {
            sender: wallet.address,
            recipient: validated.recipient,
            token: {
              address: validated.token,
              symbol,
              decimals
            },
            totalAmount: validated.totalAmount,
            startTime: new Date(startTime * 1000).toISOString(),
            endTime: new Date(endTime * 1000).toISOString(),
            duration: `${validated.duration} seconds (${(validated.duration / 86400).toFixed(2)} days)`,
            cliffPeriod: validated.cliffDuration > 0 ?
              `${validated.cliffDuration} seconds (${(validated.cliffDuration / 86400).toFixed(2)} days)` :
              'None',
            streamingRate: {
              perSecond: ratePerSecond.toFixed(decimals),
              perDay: ratePerDay,
              perMonth: (parseFloat(ratePerDay) * 30).toFixed(2)
            }
          },
          permissions: {
            cancelable: validated.cancelable,
            transferable: validated.transferable,
            senderCanCancel: validated.cancelable ? 'Yes - will return unvested tokens' : 'No - stream locked',
            recipientCanTransfer: validated.transferable ? 'Yes - can sell/transfer stream NFT' : 'No - locked to recipient'
          },
          recipientActions: {
            withdraw: `Call withdraw(${streamId}, ${validated.recipient}, amount)`,
            checkWithdrawable: `Call withdrawableAmountOf(${streamId})`,
            viewStream: `Call getStream(${streamId})`
          },
          senderActions: validated.cancelable ? {
            cancel: `Call cancel(${streamId})`,
            effect: 'Stops stream and returns unvested tokens'
          } : null,
          nftInfo: {
            streamIsNFT: true,
            tokenId: streamId.toString(),
            recipient: `${validated.recipient} owns this stream as an ERC-721 NFT`,
            transferable: validated.transferable
          },
          important: [
            'Recipient can withdraw available tokens anytime',
            validated.cliffDuration > 0 ? `No tokens available until cliff ends (${new Date((startTime + validated.cliffDuration) * 1000).toISOString()})` : null,
            'Stream is represented as an NFT (ERC-721)',
            validated.transferable ? 'Stream NFT can be transferred/sold' : 'Stream NFT is locked to recipient',
            validated.cancelable ? 'Sender can cancel and reclaim unvested tokens' : 'Stream cannot be cancelled'
          ].filter(Boolean),
          dashboardUrl: `https://app.sablier.com/stream/${validated.chain}:${streamId}`
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
          suggestion: error.message.includes('insufficient funds') ?
            'Ensure you have enough tokens and native currency for gas' :
            error.message.includes('Insufficient balance') ?
            'Not enough tokens to create stream' :
            'Check all parameters and try again'
        }, null, 2)
      }]
    };
  }
}
