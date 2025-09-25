import { ethers } from 'ethers';
import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'optimism', 'worldchain']),
  address: z.string().describe('Ethereum address to lookup'),
  verifyForward: z.boolean().optional().default(true).describe('Verify forward resolution matches')
});

export async function handleReverseEnsLookup(args: z.infer<typeof inputSchema>) {
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);

    // Validate address
    if (!ethers.isAddress(validated.address)) {
      throw new Error('Invalid Ethereum address');
    }

    const address = ethers.getAddress(validated.address); // Checksum format

    // Perform reverse lookup
    const ensName = await provider.lookupAddress(address);

    if (!ensName) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            address,
            ensName: null,
            hasReverseRecord: false,
            message: 'No ENS name configured for this address',
            howToSetup: {
              step1: 'Go to app.ens.domains',
              step2: 'Connect wallet with this address',
              step3: 'Select your ENS name',
              step4: 'Set Primary ENS Name (reverse record)',
              cost: 'Free (just gas fees)',
              benefit: 'dApps will show your ENS name instead of address'
            }
          }, null, 2)
        }]
      };
    }

    // Verify forward resolution if requested
    let forwardMatches = false;
    let forwardAddress = null;

    if (validated.verifyForward) {
      try {
        forwardAddress = await provider.resolveName(ensName);
        forwardMatches = forwardAddress?.toLowerCase() === address.toLowerCase();
      } catch (e) {
        // Forward resolution failed
      }
    }

    // Get resolver for additional info
    let resolverAddress = null;
    let avatar = null;
    let textRecords: Record<string, string | null> = {};

    try {
      const resolver = await provider.getResolver(ensName);
      if (resolver) {
        resolverAddress = resolver.address;

        // Try to get avatar
        try {
          avatar = await resolver.getAvatar();
        } catch (e) {
          // No avatar
        }

        // Get common text records
        const commonKeys = ['com.twitter', 'com.github', 'url', 'email', 'description'];
        for (const key of commonKeys) {
          try {
            const value = await resolver.getText(key);
            if (value) textRecords[key] = value;
          } catch (e) {
            // Record not set
          }
        }
      }
    } catch (e) {
      // Resolver not available
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          address,
          reverseResolution: {
            ensName,
            hasReverseRecord: true,
            resolverAddress
          },
          verification: validated.verifyForward ? {
            forwardAddress,
            matches: forwardMatches,
            warning: forwardMatches ? null : 'Forward resolution does not match - potential misconfiguration'
          } : null,
          profile: {
            avatar: avatar ? (typeof avatar === 'string' ? avatar : (avatar as any).url) : null,
            socialLinks: textRecords,
            hasProfile: Object.keys(textRecords).length > 0 || avatar !== null
          },
          useCases: [
            'Display readable name instead of address in UI',
            'Verify identity of contract or wallet',
            'Show user profiles in dApps',
            'Enable social connections via ENS',
            'Simplify address book management'
          ],
          securityNote: !forwardMatches && validated.verifyForward ?
            'WARNING: Forward resolution mismatch. This could indicate hijacking or misconfiguration.' : null,
          explorerUrl: `https://app.ens.domains/${ensName}`
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
          address: validated.address,
          suggestion: error.message.includes('network does not support ENS') ?
            'ENS reverse lookup only available on Ethereum mainnet and testnets' :
            'Ensure address is valid'
        }, null, 2)
      }]
    };
  }
}