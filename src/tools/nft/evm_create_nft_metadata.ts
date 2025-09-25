import { uploadMetadataToIPFS } from '../../utils/ipfs-nft-tool.js';

export async function handleCreateNftMetadata(args: any): Promise<{
  content: Array<{ type: string; text: string }>;
}> {
  try {
    const {
      name,
      description,
      imageUri,
      attributes,
      external_url,
      ipfsApiKey
    } = args;

    if (!name || !description || !imageUri) {
      throw new Error('name, description, and imageUri are required');
    }

    // Create metadata object
    const metadata = {
      name,
      description,
      image: imageUri,
      attributes: attributes || [],
      external_url,
      created_by: 'EVM Chains MCP Server',
      created_at: new Date().toISOString()
    };

    const service =
      (process.env.IPFS_SERVICE || 'pinata') as 'nftStorage' | 'web3Storage' | 'pinata';
    const metadataHash = await uploadMetadataToIPFS(
      metadata,
      service,
      ipfsApiKey
    );

    const metadataUri = `ipfs://${metadataHash}`;
    const gatewayUrl = `https://ipfs.io/ipfs/${metadataHash}`;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              metadata,
              ipfsHash: metadataHash,
              uri: metadataUri,
              gatewayUrl,
              message:
                'NFT metadata uploaded to IPFS successfully! Use this URI for minting.'
            },
            null,
            2
          )
        }
      ]
    };
  } catch (error: any) {
    throw new Error(`Failed to create NFT metadata: ${error.message}`);
  }
}
