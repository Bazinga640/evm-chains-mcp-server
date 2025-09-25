import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { OS_GUIDANCE, CHAIN_GUIDANCE, SUPPORTED_CHAINS } from '../constants/guidance.js';

export const NFT_TOOLS: Tool[] = [
    {
        name: 'evm_generate_nft_image',
        description: `
Generate NFT image using AI, existing URL, or local file - unified tool supporting 3 input modes.

CRITICAL RULES:
- Provide EXACTLY ONE of: prompt (AI), imageUrl (URL), or imagePath (file)
- AI generation: Free Pollinations.ai (default) or paid services (FLUX, Stable Diffusion, Playground)
- Returns image URL or path ready for IPFS upload
- No blockchain interaction - pure image preparation

THREE INPUT MODES:

MODE 1: AI Generation (Free or Paid)
- prompt: Text description (required for AI mode)
- style: artistic, realistic, cartoon, fantasy, cyberpunk, minimalist (optional)
- service: pollinations (free), flux, stable-diffusion, playground (optional, default: pollinations)
- aspectRatio: 1:1, 16:9, 9:16, 4:3, 3:4 (optional, default: 1:1)
- quality: standard, high, ultra (optional)
- seed: Number for reproducible results (optional)

MODE 2: Existing URL
- imageUrl: URL to existing image (required for URL mode)
- Validates URL format, returns for IPFS upload

MODE 3: Local File
- imagePath: Absolute path to local image file (required for file mode)
- Returns path for IPFS upload

EXAMPLES:

✅ Free AI Generation (Pollinations):
  {prompt: "Cyberpunk cat with neon eyes", style: "cyberpunk"}
  → Uses Pollinations.ai (free, no API key needed)

✅ Paid AI Generation (FLUX):
  {prompt: "Photorealistic mountain landscape", service: "flux", quality: "ultra"}
  → Uses FLUX.1 (requires FLUX_API_KEY env var)

✅ Existing URL:
  {imageUrl: "https://example.com/artwork.png"}
  → Validates and prepares for IPFS upload

✅ Local File:
  {imagePath: "/Users/me/Desktop/nft-art.jpg"}
  → Prepares local file for IPFS upload

AI SERVICES:
• Pollinations.ai - FREE, no API key, unlimited use
• FLUX.1 - Requires FLUX_API_KEY + FLUX_MODEL_VERSION
• Stable Diffusion - Requires HUGGINGFACE_API_KEY
• Playground AI - Requires PLAYGROUND_API_KEY

OUTPUT STRUCTURE:
• mode: ai_generation, existing_url, or local_file
• imageUrl: Direct URL (AI or existing)
• imagePath: Local file path (file mode)
• model: AI service used
• cost: Generation cost ($0 for Pollinations)
• suggestedFilename: Recommended filename
• nextSteps: What to do with the image

WORKFLOW:
1. Generate/select image (this tool)
2. Upload to IPFS: evm_create_nft_with_ipfs
3. Deploy NFT contract: evm_deploy_nft
4. Mint NFT: evm_mint_nft

COMMON MISTAKES:
- Providing multiple input modes (only ONE allowed)
- Expecting blockchain interaction (this is image-only)
- Not setting API keys for paid services
- Using relative paths instead of absolute paths

USE CASES:
- Generate AI art for NFT collections
- Use existing artwork from URLs
- Upload local digital art files
- Test NFT workflows with free images

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                prompt: {
                    type: 'string',
                    description: 'AI generation: Text description of image to generate'
                },
                style: {
                    type: 'string',
                    enum: ['realistic', 'artistic', 'cartoon', 'fantasy', 'cyberpunk', 'minimalist'],
                    description: 'AI generation: Art style'
                },
                service: {
                    type: 'string',
                    enum: ['pollinations', 'flux', 'stable-diffusion', 'playground'],
                    description: 'AI generation: Service to use (default: pollinations - free)'
                },
                aspectRatio: {
                    type: 'string',
                    enum: ['1:1', '16:9', '9:16', '4:3', '3:4'],
                    description: 'AI generation: Image aspect ratio (default: 1:1)'
                },
                quality: {
                    type: 'string',
                    enum: ['standard', 'high', 'ultra'],
                    description: 'AI generation: Quality level (default: high)'
                },
                seed: {
                    type: 'number',
                    description: 'AI generation: Random seed for reproducible results'
                },
                model: {
                    type: 'string',
                    description: 'AI generation: Specific model name (e.g., flux, turbo)'
                },
                imageUrl: {
                    type: 'string',
                    description: 'Existing URL: URL of image to use'
                },
                imagePath: {
                    type: 'string',
                    description: 'Local file: Absolute path to image file'
                }
            }
        }
    },
    {
        name: 'evm_deploy_nft',
        description: `
Deploy new ERC721 NFT collection with customizable name and symbol.

Deploys OpenZeppelin-based MintableNFT contract where deployer becomes owner and can mint unlimited NFTs.
Uses ERC721URIStorage for individual token metadata URIs (IPFS, HTTP, or on-chain).

CRITICAL RULES:
- Deployer becomes contract owner
- Only owner can mint NFTs
- Each NFT can have unique metadata URI
- Requires gas for deployment transaction
- Based on OpenZeppelin v5.1.0 (audited, secure)

PARAMETERS:
- chain: Target blockchain (required)
  * Must have gas in native token
  * Examples: "polygon", "ethereum", "base"

- name: Collection name (required)
  * Display name for the NFT collection
  * Examples: "My Art Collection", "Cool Punks"

- symbol: Collection symbol (required)
  * Ticker symbol for the collection
  * Usually 3-5 uppercase letters
  * Examples: "MYART", "CPUNK"

- privateKey: Deployer private key (required)
  * Becomes owner with minting rights
  * Must have sufficient gas funds
  * Format: "0x..." (64 hex characters)

EXAMPLES:
✅ Deploy art collection:
  {chain: "polygon", name: "Digital Art Collection", symbol: "DART", privateKey: "0xac0974..."}

✅ Deploy gaming NFTs:
  {chain: "base", name: "Game Items", symbol: "GITM", privateKey: "0xac0974..."}

✅ Deploy profile pictures:
  {chain: "ethereum", name: "Profile Pics", symbol: "PPIC", privateKey: "0xac0974..."}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• deployment.nftContractAddress: Deployed contract address (use for minting!)
• deployment.transactionHash: Deployment transaction hash
• collection.name: Verified collection name
• collection.symbol: Verified collection symbol
• collection.owner: Owner address (can mint)
• collection.features: Contract capabilities
• nextSteps: Complete workflow guidance

WORKFLOW:
1. Deploy collection (this tool)
2. Create assets: evm_create_nft_with_ipfs (upload image + metadata to IPFS)
3. Mint NFT: evm_mint_nft (with contractAddress from deployment)
4. Transfer/approve: Standard ERC721 operations

COMMON MISTAKES:
- Not having enough gas for deployment (~0.01-0.05 testnet tokens)
- Trying to mint before deployment completes
- Losing contract address (save nftContractAddress!)
- Using mainnet instead of testnet for testing

USE CASES:
- Create NFT collection for testing minting workflows
- Deploy collection before generating art
- Set up collection for marketplace integration
- Create testnet collection for development

SECURITY:
- OpenZeppelin v5.1.0 contracts (audited, October 2025)
- Owner-controlled minting (only you can mint)
- SafeMint protection (validates receiver contracts)
- No supply limit (unlimited minting capability)

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: {
                    type: 'string',
                    enum: SUPPORTED_CHAINS,
                    description: 'EVM chain to deploy on'
                },
                name: {
                    type: 'string',
                    description: 'NFT collection name'
                },
                symbol: {
                    type: 'string',
                    description: 'NFT collection symbol (e.g., "MYNFT")'
                },
                privateKey: {
                    type: 'string',
                    description: 'Deployer private key (0x...)'
                }
            },
            required: ['chain', 'name', 'symbol', 'privateKey']
        }
    },
    {
        name: 'evm_mint_nft',
        description: `
Mint new ERC721 NFT with metadata URI. Requires minter role on contract.

CRITICAL RULES:
- Must have MINTER_ROLE or be owner
- tokenId must be unique (not already minted)
- tokenUri links to JSON metadata (IPFS recommended)
- Requires gas for transaction

PARAMETERS:
- contractAddress: NFT collection (required)
- to: Recipient address (required)
- tokenId: Unique ID as string (required)
- tokenUri: Metadata URI (optional)
- privateKey: Minter key (required)

EXAMPLES:
✅ Mint NFT #1 with IPFS metadata:
  {chain: "polygon", contractAddress: "0xNFT...", to: "0x742d35...", tokenId: "1", tokenUri: "ipfs://QmABC...", privateKey: "0x..."}

${CHAIN_GUIDANCE}
${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: {
                    type: 'string',
                    enum: SUPPORTED_CHAINS,
                    description: 'EVM chain to execute on'
                },
                contractAddress: {
                    type: 'string',
                    description: 'NFT contract address (0x...)'
                },
                to: {
                    type: 'string',
                    description: 'Recipient address (0x...)'
                },
                tokenId: {
                    type: 'string',
                    description: 'Token ID to mint'
                },
                tokenUri: {
                    type: 'string',
                    description: 'Optional: Metadata URI (IPFS, HTTP, or base64)'
                },
                privateKey: {
                    type: 'string',
                    description: 'Minter private key (0x...)'
                }
            },
            required: ['chain', 'contractAddress', 'to', 'tokenId', 'privateKey']
        }
    },
    {
        name: 'evm_get_nft_metadata',
        description: `
Get complete NFT metadata including owner, tokenURI, and collection details.

Queries ERC721 contract for NFT ownership and metadata URI. Fetches JSON metadata from URI if available.
Supports IPFS, HTTP, and on-chain metadata formats.

CRITICAL RULES:
- tokenId must exist (already minted)
- Read-only operation (no gas cost)
- tokenURI may be empty for some NFTs
- Metadata JSON format varies by collection
- IPFS URIs may require gateway resolution

PARAMETERS:
- chain: EVM chain to query (required)
  * Must support ERC721 standard

- contractAddress: NFT collection address (required)
  * Must be valid ERC721 contract
  * Format: "0x..." (42 characters)

- tokenId: Token ID to query (required)
  * Must be minted token
  * Format: string (not number for large IDs)

EXAMPLES:
✅ Get metadata for token #123:
  {chain: "polygon", contractAddress: "0x7227E4D7...", tokenId: "123"}

✅ Query rare NFT with large ID:
  {chain: "ethereum", contractAddress: "0xBC4CA0E...", tokenId: "8762"}

❌ Invalid - non-existent token:
  {chain: "polygon", contractAddress: "0x7227E4D7...", tokenId: "999999999"}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• owner: Current owner address
• tokenURI: Metadata URI (IPFS, HTTP, or base64)
• metadata: Parsed JSON if available (name, description, image, attributes)
• collectionInfo: Contract name, symbol

COMMON MISTAKES:
- Using number type for tokenId (breaks for IDs > 2^53)
- Assuming all NFTs have metadata URIs
- Not handling IPFS gateway failures
- Expecting consistent metadata format across collections

USE CASES:
- Verify NFT ownership before operations
- Display NFT details in marketplace UI
- Validate metadata before purchasing
- Audit collection traits and rarity

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: {
                    type: 'string',
                    enum: SUPPORTED_CHAINS,
                    description: 'EVM chain to query'
                },
                contractAddress: {
                    type: 'string',
                    description: 'NFT contract address (0x...)'
                },
                tokenId: {
                    type: 'string',
                    description: 'Token ID to query'
                }
            },
            required: ['chain', 'contractAddress', 'tokenId']
        }
    },
    {
        name: 'evm_transfer_nft',
        description: `
Transfer ERC721 NFT to another address with automatic ownership verification.

Executes safeTransferFrom on NFT contract. Verifies sender owns token before transfer. Recipient
can be EOA or contract implementing IERC721Receiver. Transaction fails if not token owner.

CRITICAL RULES:
- Must own the NFT being transferred
- Requires gas in native token
- Cannot transfer to zero address (0x0)
- Recipient contract must implement IERC721Receiver
- Approved operators can transfer on owner's behalf
- Irreversible once confirmed

PARAMETERS:
- chain: EVM chain to execute on (required)
  * Must have gas in native token

- contractAddress: NFT collection address (required)
  * Must be valid ERC721 contract
  * Format: "0x..." (42 characters)

- to: Recipient address (required)
  * Can be EOA or contract
  * Cannot be zero address
  * Format: "0x..." (42 characters)

- tokenId: Token ID to transfer (required)
  * Must be owned by sender
  * Format: string (not number for large IDs)

- privateKey: Owner's private key (required)
  * Must own the token OR be approved operator
  * Format: "0x..." (64 hex characters)

EXAMPLES:
✅ Transfer NFT #42 to collector:
  {chain: "polygon", contractAddress: "0x7227E4D7...", to: "0x742d35Cc...", tokenId: "42", privateKey: "0xac0974..."}

✅ Transfer rare NFT on Ethereum:
  {chain: "ethereum", contractAddress: "0xBC4CA0E...", to: "0x8626f6940...", tokenId: "8762", privateKey: "0xac0974..."}

❌ Invalid - not token owner:
  {chain: "polygon", contractAddress: "0x7227E4D7...", to: "0x742d35Cc...", tokenId: "100", privateKey: "0xwrongkey..."}

❌ Invalid - zero address recipient:
  {chain: "polygon", contractAddress: "0x7227E4D7...", to: "0x0000000000000000000000000000000000000000", tokenId: "42", privateKey: "0xac0974..."}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Transfer confirmation
• transactionHash: On-chain transaction hash
• from: Previous owner address
• to: New owner address
• tokenId: Transferred token ID
• gasUsed: Gas consumed in transaction

COMMON MISTAKES:
- Not verifying ownership before transfer attempt
- Transferring to contract without IERC721Receiver
- Using wrong private key (not owner or approved)
- Insufficient gas in wallet
- Transferring to zero address

USE CASES:
- Sell NFT to buyer after payment
- Gift NFT to another wallet
- Move NFT to cold storage
- Transfer between own wallets
- Execute marketplace sale

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: {
                    type: 'string',
                    enum: SUPPORTED_CHAINS,
                    description: 'EVM chain to execute on'
                },
                contractAddress: {
                    type: 'string',
                    description: 'NFT contract address (0x...)'
                },
                to: {
                    type: 'string',
                    description: 'Recipient address (0x...)'
                },
                tokenId: {
                    type: 'string',
                    description: 'Token ID to transfer'
                },
                privateKey: {
                    type: 'string',
                    description: 'Owner private key (0x...)'
                }
            },
            required: ['chain', 'contractAddress', 'to', 'tokenId', 'privateKey']
        }
    },
    {
        name: 'evm_get_nft_balance',
        description: `
Get total count of NFTs owned in a specific ERC721 collection.

Queries balanceOf function on NFT contract. Returns total count of tokens owned in collection.
Does not return individual token IDs - use with tokenOfOwnerByIndex for enumeration.

CRITICAL RULES:
- Returns count only, not token IDs
- Read-only operation (no gas cost)
- Result is 0 if address owns no NFTs
- Some contracts don't support enumeration
- Balance updated after transfers/mints

PARAMETERS:
- chain: EVM chain to query (required)
  * Must support ERC721 standard

- contractAddress: NFT collection address (required)
  * Must be valid ERC721 contract
  * Format: "0x..." (42 characters)

- address: Wallet address to check (required)
  * Any valid Ethereum address
  * Format: "0x..." (42 characters)

EXAMPLES:
✅ Check collector's NFT balance:
  {chain: "polygon", contractAddress: "0x7227E4D7...", address: "0x742d35Cc..."}

✅ Verify ownership (balance > 0):
  {chain: "ethereum", contractAddress: "0xBC4CA0E...", address: "0x8626f6940..."}

❌ Invalid - malformed address:
  {chain: "polygon", contractAddress: "0x7227E4D7...", address: "0xinvalid"}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• balance: NFT count in collection
• collection: Contract address
• owner: Queried address

COMMON MISTAKES:
- Expecting token IDs instead of count
- Not checking if balance is 0
- Assuming enumeration support (not all ERC721)
- Confusing with ERC20 balance (different scale)

USE CASES:
- Verify NFT ownership in collection
- Check eligibility for holder benefits
- Display collection size in wallet UI
- Validate ownership before operations
- Track collector portfolio size

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: {
                    type: 'string',
                    enum: SUPPORTED_CHAINS,
                    description: 'EVM chain to query'
                },
                contractAddress: {
                    type: 'string',
                    description: 'NFT contract address (0x...)'
                },
                address: {
                    type: 'string',
                    description: 'Wallet address to check (0x...)'
                }
            },
            required: ['chain', 'contractAddress', 'address']
        }
    },
    {
        name: 'evm_approve_nft',
        description: `
Approve address to spend specific NFT or operate on entire collection.

Two approval modes: single token (approve) or all tokens (setApprovalForAll). Single approval
for specific sales. Operator approval for marketplace contracts to manage all NFTs.

CRITICAL RULES:
- Must own NFT for single approval
- Operator approval affects ALL NFTs in collection
- Requires gas for transaction
- Previous approvals overwritten
- Revoke by approving zero address
- Marketplace contracts need operator approval

PARAMETERS:
- chain: EVM chain to execute on (required)
  * Must have gas in native token

- contractAddress: NFT collection address (required)
  * Must be valid ERC721 contract
  * Format: "0x..." (42 characters)

- spender: Address to approve (required)
  * Marketplace contract or buyer address
  * Format: "0x..." (42 characters)

- tokenId: Token ID for single approval (optional)
  * Mutually exclusive with approveAll
  * Must own this token

- approveAll: Approve all NFTs flag (optional)
  * Set true for operator approval
  * Mutually exclusive with tokenId

- privateKey: Owner's private key (required)
  * Must own the NFT(s)
  * Format: "0x..." (64 hex characters)

EXAMPLES:
✅ Approve single NFT for sale:
  {chain: "polygon", contractAddress: "0x7227E4D7...", spender: "0x742d35Cc...", tokenId: "42", privateKey: "0xac0974..."}

✅ Approve marketplace as operator:
  {chain: "ethereum", contractAddress: "0xBC4CA0E...", spender: "0xMarketplace...", approveAll: true, privateKey: "0xac0974..."}

❌ Invalid - both tokenId and approveAll:
  {chain: "polygon", contractAddress: "0x7227E4D7...", spender: "0x742d35Cc...", tokenId: "42", approveAll: true, privateKey: "0xac0974..."}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Approval confirmation
• transactionHash: On-chain transaction hash
• approvalType: "single" or "operator"
• spender: Approved address
• tokenId: Approved token (if single)

COMMON MISTAKES:
- Using operator approval for single sale (unnecessary)
- Not revoking operator approval after use
- Approving without verifying spender address
- Forgetting approval expires on transfer

USE CASES:
- List NFT on marketplace
- Enable marketplace to manage collection
- Pre-approve buyer for direct sale
- Grant operator rights to auction contract
- Revoke previous approvals

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: {
                    type: 'string',
                    enum: SUPPORTED_CHAINS,
                    description: 'EVM chain to execute on'
                },
                contractAddress: {
                    type: 'string',
                    description: 'NFT contract address (0x...)'
                },
                spender: {
                    type: 'string',
                    description: 'Spender address to approve (0x...)'
                },
                tokenId: {
                    type: 'string',
                    description: 'Optional: Token ID for single token approval'
                },
                approveAll: {
                    type: 'boolean',
                    description: 'Optional: Set true to approve all NFTs for operator'
                },
                privateKey: {
                    type: 'string',
                    description: 'Owner private key (0x...)'
                }
            },
            required: ['chain', 'contractAddress', 'spender', 'privateKey']
        }
    },
    {
        name: 'evm_get_nft_approved',
        description: 'Get the approved address for a specific NFT token ID',
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                contractAddress: { type: 'string', description: 'NFT contract address' },
                tokenId: { type: 'string', description: 'Token ID to query' }
            },
            required: ['chain', 'contractAddress', 'tokenId']
        }
    },
    {
        name: 'evm_is_approved_for_all',
        description: 'Check if an operator is approved to manage all NFTs for an owner',
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                contractAddress: { type: 'string', description: 'NFT contract address' },
                owner: { type: 'string', description: 'Owner address' },
                operator: { type: 'string', description: 'Operator address to check' }
            },
            required: ['chain', 'contractAddress', 'owner', 'operator']
        }
    },
    {
        name: 'evm_set_approval_for_all',
        description: 'Approve or revoke operator permissions to manage all NFTs',
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                contractAddress: { type: 'string', description: 'NFT contract address' },
                operator: { type: 'string', description: 'Operator address to approve/revoke' },
                approved: { type: 'boolean', description: 'True to approve, false to revoke' },
                privateKey: { type: 'string', description: 'Private key of NFT owner' }
            },
            required: ['chain', 'contractAddress', 'operator', 'approved', 'privateKey']
        }
    },
    {
        name: 'evm_get_nft_info',
        description: 'Get comprehensive information about an NFT including name, symbol, and token URI',
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                contractAddress: { type: 'string', description: 'NFT contract address' },
                tokenId: { type: 'string', description: 'Token ID to query' }
            },
            required: ['chain', 'contractAddress', 'tokenId']
        }
    },
    {
        name: 'evm_get_nfts_by_owner',
        description: 'Get all NFT token IDs owned by specific owner address in a collection. Parameter: owner (not address). Requires ERC721Enumerable.',
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                contractAddress: { type: 'string', description: 'NFT contract address' },
                owner: { type: 'string', description: 'Owner wallet address to query' },
                limit: { type: 'number', description: 'Maximum number of NFTs to return (default: 100)' }
            },
            required: ['chain', 'contractAddress', 'owner']
        }
    },
    {
        name: 'evm_get_nft_owner',
        description: `
Get current owner address of specific ERC721 token.

Queries ownerOf function on NFT contract. Returns current owner's address. Fails if token
doesn't exist or hasn't been minted. Read-only operation with no gas cost.

CRITICAL RULES:
- Token must be minted
- Read-only operation (no gas cost)
- Returns current owner only
- Ownership changes after transfers
- Reverts if token doesn't exist

PARAMETERS:
- chain: EVM chain to query (required)
  * Must support ERC721 standard

- contractAddress: NFT collection address (required)
  * Must be valid ERC721 contract
  * Format: "0x..." (42 characters)

- tokenId: Token ID to query (required)
  * Must be minted token
  * Format: string (not number for large IDs)

EXAMPLES:
✅ Check owner of NFT #123:
  {chain: "polygon", contractAddress: "0x7227E4D7...", tokenId: "123"}

✅ Verify ownership of rare token:
  {chain: "ethereum", contractAddress: "0xBC4CA0E...", tokenId: "8762"}

❌ Invalid - non-existent token:
  {chain: "polygon", contractAddress: "0x7227E4D7...", tokenId: "999999999"}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• owner: Current owner address
• tokenId: Queried token ID
• collection: Contract address

COMMON MISTAKES:
- Querying unminted tokens
- Not handling revert for non-existent IDs
- Caching owner without checking for transfers
- Assuming token exists in collection

USE CASES:
- Verify ownership before operations
- Display current holder in marketplace
- Validate ownership claims
- Track NFT provenance
- Check if address owns specific token

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: {
                    type: 'string',
                    enum: SUPPORTED_CHAINS,
                    description: 'EVM chain to query'
                },
                contractAddress: {
                    type: 'string',
                    description: 'NFT contract address (0x...)'
                },
                tokenId: {
                    type: 'string',
                    description: 'Token ID to query'
                }
            },
            required: ['chain', 'contractAddress', 'tokenId']
        }
    },
    {
        name: 'evm_create_nft_with_ipfs',
        description: `
Create complete NFT with automatic IPFS upload for image and metadata.

End-to-end NFT asset creation: uploads image to IPFS, creates ERC721 metadata JSON with image
reference, uploads metadata to IPFS. Returns metadata URI ready for minting with evm_mint_nft.

CRITICAL RULES:
- Requires PINATA_API_KEY in environment
- Uploads image first, then metadata
- Returns metadata URI for minting
- Does NOT mint on-chain (use evm_mint_nft after)
- Image can be URL or local path

PARAMETERS:
- imageUrl: Image URL to upload (optional)
  * HTTP/HTTPS URL to image file
  * Mutually exclusive with imagePath

- imagePath: Local image path (optional)
  * Absolute path to local image file
  * Mutually exclusive with imageUrl

- name: NFT name (required)
  * Display name for the NFT

- description: NFT description (required)
  * Detailed description of the NFT

- attributes: NFT traits (optional)
  * Array of {trait_type, value} objects
  * Standard ERC721 metadata format

- external_url: External URL (optional)
  * Link to external website

- ipfsApiKey: IPFS API key (optional)
  * Overrides PINATA_API_KEY env var

EXAMPLES:
✅ Create from URL:
  {imageUrl: "https://example.com/art.png", name: "Cool NFT", description: "My first NFT"}

✅ Create from local file:
  {imagePath: "/Users/me/art.jpg", name: "Local Art", description: "Uploaded from disk"}

✅ With attributes:
  {imageUrl: "https://example.com/art.png", name: "Rare NFT", description: "Limited edition", attributes: [{"trait_type": "Rarity", "value": "Legendary"}]}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• image.ipfsHash: Image IPFS CID
• image.uri: ipfs://... URI
• image.gatewayUrl: Public IPFS gateway URL
• metadata.ipfsHash: Metadata IPFS CID
• metadata.uri: ipfs://... URI (use this for minting!)
• metadata.gatewayUrl: Public metadata URL

COMMON MISTAKES:
- Not setting PINATA_API_KEY environment variable
- Trying to provide both imageUrl and imagePath
- Using metadata URI instead of just the hash
- Forgetting to mint after creating assets

USE CASES:
- Complete NFT creation workflow
- Prepare NFT for minting
- Upload art with metadata
- Create NFT collection assets
- Automated NFT generation

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                imageUrl: {
                    type: 'string',
                    description: 'URL of image to upload to IPFS'
                },
                imagePath: {
                    type: 'string',
                    description: 'Local path to image file'
                },
                name: {
                    type: 'string',
                    description: 'NFT name'
                },
                description: {
                    type: 'string',
                    description: 'NFT description'
                },
                attributes: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            trait_type: { type: 'string' },
                            value: { type: ['string', 'number'] }
                        }
                    },
                    description: 'NFT attributes/traits'
                },
                external_url: {
                    type: 'string',
                    description: 'External URL for the NFT'
                },
                ipfsApiKey: {
                    type: 'string',
                    description: 'API key for IPFS service (optional)'
                }
            },
            required: ['name', 'description']
        }
    },
    {
        name: 'evm_upload_image_to_ipfs',
        description: `
Upload image to IPFS and get back IPFS hash and URI.

Uploads image file to IPFS using Pinata. Supports both URLs and local file paths. Returns IPFS
hash, URI, and gateway URL for the uploaded image.

CRITICAL RULES:
- Requires PINATA_API_KEY in environment
- One of imageUrl or imagePath required
- Returns IPFS hash usable in metadata

PARAMETERS:
- imageUrl: Image URL (optional)
- imagePath: Local file path (optional)
- ipfsApiKey: Override API key (optional)

EXAMPLES:
✅ Upload from URL: {imageUrl: "https://example.com/art.png"}
✅ Upload local file: {imagePath: "/Users/me/art.jpg"}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• ipfsHash: IPFS CID
• uri: ipfs://... format
• gatewayUrl: Public URL

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                imageUrl: {
                    type: 'string',
                    description: 'URL of image to upload'
                },
                imagePath: {
                    type: 'string',
                    description: 'Local path to image file'
                },
                ipfsApiKey: {
                    type: 'string',
                    description: 'API key for IPFS service (optional)'
                }
            }
        }
    },
    {
        name: 'evm_create_nft_metadata',
        description: `
Create NFT metadata JSON and upload to IPFS.

Creates ERC721 metadata JSON with image reference, uploads to IPFS. Use after uploading image
with evm_upload_image_to_ipfs. Returns metadata URI for minting.

CRITICAL RULES:
- Requires PINATA_API_KEY in environment
- imageUri must be ipfs:// format
- Returns metadata URI for minting

PARAMETERS:
- name: NFT name (required)
- description: NFT description (required)
- imageUri: Image IPFS URI (required)
  * Format: "ipfs://QmHash..."
- attributes: Traits (optional)
- external_url: External link (optional)
- ipfsApiKey: Override API key (optional)

EXAMPLES:
✅ Create metadata:
  {name: "My NFT", description: "Cool art", imageUri: "ipfs://QmABC123..."}

✅ With attributes:
  {name: "Rare NFT", description: "Limited", imageUri: "ipfs://QmABC...", attributes: [{"trait_type": "Rarity", "value": "Epic"}]}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• metadata: Full metadata object
• ipfsHash: Metadata IPFS CID
• uri: ipfs://... (use for minting)
• gatewayUrl: Public URL

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'NFT name'
                },
                description: {
                    type: 'string',
                    description: 'NFT description'
                },
                imageUri: {
                    type: 'string',
                    description: 'IPFS URI of the image (ipfs://...)'
                },
                attributes: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            trait_type: { type: 'string' },
                            value: { type: ['string', 'number'] }
                        }
                    },
                    description: 'NFT attributes/traits'
                },
                external_url: {
                    type: 'string',
                    description: 'External URL for the NFT'
                },
                ipfsApiKey: {
                    type: 'string',
                    description: 'API key for IPFS service (optional)'
                }
            },
            required: ['name', 'description', 'imageUri']
        }
    }
];
