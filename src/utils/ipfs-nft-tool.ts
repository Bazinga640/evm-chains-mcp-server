/**
 * IPFS NFT Upload Tool for EVM Chains
 * Handles image upload to IPFS and NFT metadata creation
 */

import FormData from 'form-data';
import axios from 'axios';
import fs from 'fs';

// Free IPFS services configuration
const IPFS_SERVICES = {
  // NFT.Storage - Best for NFTs, completely free
  nftStorage: {
    url: 'https://api.nft.storage/upload',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`
    })
  },

  // Web3.Storage - Also free
  web3Storage: {
    url: 'https://api.web3.storage/upload',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`
    })
  },

  // Pinata - 1GB free (using pinata_api_jwt for simplicity)
  pinata: {
    url: 'https://api.pinata.cloud/pinning/pinFileToIPFS',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`
    })
  }
};

/**
 * Upload image to IPFS using free services
 */
export async function uploadImageToIPFS(
  imagePathOrUrl: string,
  service: 'nftStorage' | 'web3Storage' | 'pinata' = 'pinata',
  apiKey?: string
): Promise<string> {

  // Use API key from environment if not provided
  const effectiveApiKey = apiKey || process.env.PINATA_API_KEY;

  if (!effectiveApiKey) {
    throw new Error(`IPFS API key required for ${service}. Set PINATA_API_KEY in environment variables.`);
  }

  try {
    const imageForm = new FormData();

    if (imagePathOrUrl.startsWith('http')) {
      // Download image first as buffer
      try {
        const response = await axios.get(imagePathOrUrl, {
          responseType: 'arraybuffer',
          timeout: 10000
        });
        const buffer = Buffer.from(response.data);
        const filename = `nft-image-${Date.now()}.jpg`;
        imageForm.append('file', buffer, filename);
      } catch (err) {
        throw new Error(`Failed to download image from URL: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } else {
      // Local file - check if exists
      if (!fs.existsSync(imagePathOrUrl)) {
        throw new Error(`Local file not found: ${imagePathOrUrl}`);
      }
      imageForm.append('file', fs.createReadStream(imagePathOrUrl));
    }

    const serviceConfig = IPFS_SERVICES[service];
    const headers = { ...serviceConfig.headers(effectiveApiKey), ...imageForm.getHeaders() };

    const imageResponse = await axios.post(
      serviceConfig.url,
      imageForm,
      { headers }
    );

    // Extract CID from response
    const imageHash = imageResponse.data.IpfsHash || imageResponse.data.cid;

    if (!imageHash) {
      throw new Error('Failed to get IPFS hash from response');
    }

    return imageHash;
  } catch (error) {
    const errorDetails = error && typeof error === 'object' && 'response' in error ? {
      status: (error as any).response?.status,
      statusText: (error as any).response?.statusText,
      data: JSON.stringify((error as any).response?.data)
    } : {};

    throw new Error(`IPFS image upload failed (${service}): ${error instanceof Error ? error.message : String(error)}${Object.keys(errorDetails).length ? ` - ${JSON.stringify(errorDetails)}` : ''}`);
  }
}

/**
 * Upload metadata JSON to IPFS
 */
export async function uploadMetadataToIPFS(
  metadata: any,
  service: 'nftStorage' | 'web3Storage' | 'pinata' = 'pinata',
  apiKey?: string
): Promise<string> {

  const effectiveApiKey = apiKey || process.env.PINATA_API_KEY;

  if (!effectiveApiKey) {
    throw new Error(`IPFS API key required for ${service}. Set PINATA_API_KEY in environment variables.`);
  }

  try {
    const metadataForm = new FormData();
    metadataForm.append('file', Buffer.from(JSON.stringify(metadata, null, 2)), 'metadata.json');

    const serviceConfig = IPFS_SERVICES[service];
    const headers = { ...serviceConfig.headers(effectiveApiKey), ...metadataForm.getHeaders() };

    const metadataResponse = await axios.post(
      serviceConfig.url,
      metadataForm,
      { headers }
    );

    const metadataHash = metadataResponse.data.IpfsHash || metadataResponse.data.cid;

    if (!metadataHash) {
      throw new Error('Failed to get IPFS hash from response');
    }

    return metadataHash;
  } catch (error) {
    const errorDetails = error && typeof error === 'object' && 'response' in error ? {
      status: (error as any).response?.status,
      statusText: (error as any).response?.statusText,
      data: JSON.stringify((error as any).response?.data)
    } : {};

    throw new Error(`IPFS metadata upload failed (${service}): ${error instanceof Error ? error.message : String(error)}${Object.keys(errorDetails).length ? ` - ${JSON.stringify(errorDetails)}` : ''}`);
  }
}

/**
 * Complete NFT metadata creation with IPFS integration
 * Uploads image, creates metadata with image reference, uploads metadata
 */
export async function createNFTWithIPFS(args: {
  imageUrl?: string;
  imagePath?: string;
  name: string;
  description: string;
  attributes?: Array<{ trait_type: string; value: any }>;
  external_url?: string;
  ipfsApiKey?: string;
}): Promise<{
  imageHash: string;
  metadataHash: string;
  imageUri: string;
  metadataUri: string;
  gatewayUrls: {
    image: string;
    metadata: string;
  };
}> {

  if (!args.imageUrl && !args.imagePath) {
    throw new Error('Either imageUrl or imagePath must be provided');
  }

  // Step 1: Upload image to IPFS
  const service = (process.env.IPFS_SERVICE || 'pinata') as 'nftStorage' | 'web3Storage' | 'pinata';
  const imageHash = await uploadImageToIPFS(
    args.imageUrl || args.imagePath!,
    service,
    args.ipfsApiKey
  );

  const imageUri = `ipfs://${imageHash}`;

  // Step 2: Create metadata with image reference
  const metadata = {
    name: args.name,
    description: args.description,
    image: imageUri,
    attributes: args.attributes || [],
    external_url: args.external_url,
    created_by: 'EVM Chains MCP Server',
    created_at: new Date().toISOString()
  };

  // Step 3: Upload metadata to IPFS
  const metadataHash = await uploadMetadataToIPFS(
    metadata,
    service,
    args.ipfsApiKey
  );

  const metadataUri = `ipfs://${metadataHash}`;

  return {
    imageHash,
    metadataHash,
    imageUri,
    metadataUri,
    gatewayUrls: {
      image: `https://ipfs.io/ipfs/${imageHash}`,
      metadata: `https://ipfs.io/ipfs/${metadataHash}`
    }
  };
}
