import { ethers } from 'ethers';
import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

// ENS registry addresses
const ENS_REGISTRIES: Record<string, string> = {
  ethereum: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
  goerli: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
  sepolia: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
  // ENS not natively available on other chains, but can use L2 resolvers
  polygon: '0x0000000000000000000000000000000000000000',
  arbitrum: '0x0000000000000000000000000000000000000000',
  optimism: '0x0000000000000000000000000000000000000000',
  base: '0x0000000000000000000000000000000000000000',
  avalanche: '0x0000000000000000000000000000000000000000',
  bsc: '0x0000000000000000000000000000000000000000',
  worldchain: '0x0000000000000000000000000000000000000000'
};

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'optimism', 'worldchain']),
  ensName: z.string().describe('ENS name to resolve (e.g., vitalik.eth)'),
  resolveAvatar: z.boolean().optional().default(false).describe('Resolve avatar URL'),
  resolveText: z.array(z.string()).optional().describe('Text records to resolve (email, url, etc.)')
});

export async function handleResolveEns(args: z.infer<typeof inputSchema>) {
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);

    const registryAddress = ENS_REGISTRIES[validated.chain];

    if (!registryAddress || registryAddress === '0x0000000000000000000000000000000000000000') {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: `ENS not natively supported on ${validated.chain}`,
            recommendation: 'Use Ethereum mainnet or testnets for ENS resolution',
            alternatives: [
              'Resolve on Ethereum and use the address on other chains',
              'Use cross-chain ENS resolvers (experimental)',
              'Use CCIP-Read for L2 ENS names'
            ]
          }, null, 2)
        }]
      };
    }

    // Validate ENS name format
    if (!validated.ensName.endsWith('.eth') && !validated.ensName.includes('.')) {
      throw new Error('Invalid ENS name format. Must be like: name.eth');
    }

    // Resolve address using provider's ENS support
    const address = await provider.resolveName(validated.ensName);

    if (!address) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            ensName: validated.ensName,
            resolved: false,
            message: 'ENS name not found or not configured',
            possibleReasons: [
              'Name not registered',
              'No resolver configured',
              'Name expired',
              'Resolver not set to address'
            ],
            checkOnEtherscan: `https://etherscan.io/enslookup-search?search=${validated.ensName}`
          }, null, 2)
        }]
      };
    }

    // Get resolver
    const resolver = await provider.getResolver(validated.ensName);

    if (!resolver) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            ensName: validated.ensName,
            address,
            resolver: null,
            warning: 'No resolver configured - cannot fetch additional records'
          }, null, 2)
        }]
      };
    }

    // Get avatar if requested
    let avatar: null | string | { url: string; linkage: number[] } = null;
    if (validated.resolveAvatar) {
      try {
        avatar = await resolver.getAvatar();
      } catch (e) {
        // No avatar set
      }
    }

    // Get text records if requested
    const textRecords: Record<string, string | null> = {};
    if (validated.resolveText && validated.resolveText.length > 0) {
      for (const key of validated.resolveText) {
        try {
          textRecords[key] = await resolver.getText(key);
        } catch (e) {
          textRecords[key] = null;
        }
      }
    }

    // Get content hash
    let contentHash = null;
    try {
      contentHash = await resolver.getContentHash();
    } catch (e) {
      // No content hash
    }

    // Try to get reverse resolution (address -> name)
    let primaryName = null;
    try {
      primaryName = await provider.lookupAddress(address);
    } catch (e) {
      // No reverse record
    }

    // Process avatar with explicit type handling
    let avatarData: { url: string; linkType: string | number[] } | null = null;
    if (avatar) {
      if (typeof avatar === 'string') {
        avatarData = { url: avatar, linkType: 'url' };
      } else if (typeof avatar === 'object' && avatar !== null && 'url' in avatar) {
        const avatarObj = avatar as { url: string; linkage: number[] };
        avatarData = { url: avatarObj.url, linkType: avatarObj.linkage };
      }
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          ensName: validated.ensName,
          resolution: {
            address,
            isPrimaryName: primaryName?.toLowerCase() === validated.ensName.toLowerCase(),
            primaryName: primaryName
          },
          avatar: avatarData,
          textRecords: Object.keys(textRecords).length > 0 ? textRecords : null,
          contentHash: contentHash ? {
            hash: contentHash,
            type: contentHash.startsWith('ipfs://') ? 'IPFS' :
                  contentHash.startsWith('ipns://') ? 'IPNS' :
                  contentHash.startsWith('ar://') ? 'Arweave' : 'Other'
          } : null,
          commonTextRecords: {
            available: [
              'email', 'url', 'avatar', 'description',
              'notice', 'keywords', 'com.twitter', 'com.github',
              'com.discord', 'com.reddit', 'com.telegram',
              'eth.ens.delegate'
            ],
            howToUse: 'Pass in resolveText array to fetch these records'
          },
          useCases: [
            'Send transactions to ENS name instead of address',
            'Display human-readable names in dApps',
            'Resolve to addresses across all networks',
            'Link social profiles to wallet',
            'Set up decentralized websites'
          ],
          explorerUrl: `https://app.ens.domains/${validated.ensName}`
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
          ensName: validated.ensName,
          suggestion: error.message.includes('network does not support ENS') ?
            'ENS is only available on Ethereum mainnet and testnets' :
            'Ensure ENS name is valid and registered'
        }, null, 2)
      }]
    };
  }
}