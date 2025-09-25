import { uploadImageToIPFS } from '../../utils/ipfs-nft-tool.js';

export async function handleUploadImageToIpfs(args: any): Promise<{
  content: Array<{ type: string; text: string }>;
}> {
  try {
    const { imageUrl, imagePath, ipfsApiKey } = args;

    if (!imageUrl && !imagePath) {
      throw new Error('Either imageUrl or imagePath must be provided');
    }

    const service =
      (process.env.IPFS_SERVICE || 'pinata') as 'nftStorage' | 'web3Storage' | 'pinata';
    const imageHash = await uploadImageToIPFS(
      imageUrl || imagePath,
      service,
      ipfsApiKey
    );

    const imageUri = `ipfs://${imageHash}`;
    const gatewayUrl = `https://ipfs.io/ipfs/${imageHash}`;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              ipfsHash: imageHash,
              uri: imageUri,
              gatewayUrl,
              message: 'Image uploaded to IPFS successfully!'
            },
            null,
            2
          )
        }
      ]
    };
  } catch (error: any) {
    throw new Error(`Failed to upload image to IPFS: ${error.message}`);
  }
}
