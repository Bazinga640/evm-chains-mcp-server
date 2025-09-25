import { createNFTWithIPFS } from '../../utils/ipfs-nft-tool.js';

export async function handleCreateNftWithIpfs(args: any): Promise<{
  content: Array<{ type: string; text: string }>;
}> {
  try {
    const {
      imageUrl,
      imagePath,
      name,
      description,
      attributes,
      external_url,
      ipfsApiKey
    } = args;

    if (!imageUrl && !imagePath) {
      throw new Error('Either imageUrl or imagePath must be provided');
    }

    const result = await createNFTWithIPFS({
      imageUrl,
      imagePath,
      name,
      description,
      attributes,
      external_url,
      ipfsApiKey
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              image: {
                ipfsHash: result.imageHash,
                uri: result.imageUri,
                gatewayUrl: result.gatewayUrls.image
              },
              metadata: {
                ipfsHash: result.metadataHash,
                uri: result.metadataUri,
                gatewayUrl: result.gatewayUrls.metadata
              },
              nft: {
                name,
                description,
                attributes: attributes || []
              },
              message:
                'NFT assets created successfully! Use metadata URI for minting with evm_mint_nft.'
            },
            null,
            2
          )
        }
      ]
    };
  } catch (error: any) {
    throw new Error(`Failed to create NFT with IPFS: ${error.message}`);
  }
}
