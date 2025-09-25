import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { OS_GUIDANCE, CHAIN_GUIDANCE, SUPPORTED_CHAINS } from '../constants/guidance.js';

export const CONTRACTS_TOOLS: Tool[] = [
    {
        name: 'evm_call_contract',
        description: `
Call a smart contract view/pure function for read-only access (no gas cost, no state changes).

Executes contract function locally without broadcasting transaction. Used to query contract state,
read data, or simulate operations. No blockchain state modifications - perfect for getting information.

CRITICAL RULES:
- Only works with view/pure functions (read-only)
- NO gas cost (local execution)
- Does NOT modify blockchain state
- Requires contract ABI to understand function interface
- Parameters must match function signature exactly
- Returns data immediately (no transaction confirmation needed)

PARAMETERS:
- chain: EVM chain where contract is deployed (required)
  * Contract must exist on specified chain
  * Different chains may have different contract instances

- contractAddress: Smart contract address (required)
  * Format: 0x followed by 40 hex characters
  * Must be deployed contract
  * Examples: DEX routers, NFT contracts, lending pools

- abi: Contract Application Binary Interface (required)
  * JSON array defining contract interface
  * Get from block explorer (verified contracts)
  * Defines function names, parameters, return types
  * Example: [{\"name\":\"balanceOf\",\"inputs\":[...],\"outputs\":[...]}]

- functionName: Name of function to call (required)
  * Must be view or pure function
  * Exact name as defined in contract
  * Case-sensitive (balanceOf ≠ BalanceOf)
  * Examples: "balanceOf", "totalSupply", "getReserves"

- params: Function parameters array (optional)
  * Must match function signature order
  * Correct types: addresses as strings, numbers as strings
  * Empty array [] if function takes no parameters
  * Examples: ["0x742d35..."], ["100", "200"], []

EXAMPLES:
✅ Check token balance (ERC20 balanceOf):
  {chain: "polygon", contractAddress: "0x2791Bca...", abi: [...ERC20_ABI], functionName: "balanceOf", params: ["0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"]}

✅ Get DEX pool reserves:
  {chain: "arbitrum", contractAddress: "0xPairAddress...", abi: [...], functionName: "getReserves", params: []}

✅ Check NFT owner:
  {chain: "ethereum", contractAddress: "0xNFT...", abi: [...ERC721_ABI], functionName: "ownerOf", params: ["1"]}

❌ Invalid - trying to call write function:
  {functionName: "transfer"} // transfer modifies state, use evm_send_contract_transaction

❌ Invalid - wrong parameter count:
  {functionName: "balanceOf", params: []} // balanceOf requires address parameter

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating call success
• chain: Chain queried
• contractAddress: Contract called
• functionName: Function executed
• result: Return value(s) from function (decoded)
• resultRaw: Raw hex-encoded return data
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Using with write functions (will fail - use evm_send_contract_transaction)
- Wrong parameter types (address as number, etc.)
- Missing required parameters
- Wrong ABI (function signature doesn't match)
- Incorrect parameter order
- Not handling complex return types (tuples, arrays)

USE CASES:
- Query token balances without transactions
- Get DEX prices and reserves
- Check NFT ownership and metadata URIs
- Read lending protocol rates
- Verify contract state before writing
- Simulate operations locally

VIEW/PURE FUNCTIONS:
- view: Reads blockchain state (storage, balance, etc.)
- pure: No state access (pure computation)
- Both execute locally (no gas, no transaction)
- Common examples:
  * balanceOf(address) - token balance
  * totalSupply() - total tokens
  * getReserves() - DEX reserves
  * ownerOf(uint256) - NFT owner

GETTING CONTRACT ABI:
1. Etherscan/PolygonScan - verified contracts show ABI
2. Block explorer "Contract" tab
3. Project GitHub repository
4. npm packages for common contracts (@uniswap/v2-core)

ABI EXAMPLES:
ERC20 balanceOf ABI:
[{
  "name": "balanceOf",
  "type": "function",
  "stateMutability": "view",
  "inputs": [{"name": "account", "type": "address"}],
  "outputs": [{"name": "balance", "type": "uint256"}]
}]

RETURN VALUE TYPES:
- Single value: Returned directly
- Multiple values: Returned as array
- Struct/tuple: Returned as object
- Array: Returned as array
- BigNumber strings for large numbers

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
                    description: 'Smart contract address (0x...)'
                },
                abi: {
                    type: 'array',
                    description: 'Contract ABI (JSON array)'
                },
                functionName: {
                    type: 'string',
                    description: 'Function name to call'
                },
                params: {
                    type: 'array',
                    description: 'Function parameters (optional)'
                }
            },
            required: ['chain', 'contractAddress', 'abi', 'functionName']
        }
    },
    {
        name: 'evm_send_contract_transaction',
        description: `
Send transaction to smart contract to execute write function (modifies state, requires gas).

Broadcasts transaction to blockchain that modifies contract state. Used for token transfers, staking,
swaps, NFT minting, and any operation that changes on-chain data. Transaction must be confirmed by network.

CRITICAL RULES:
- Modifies blockchain state (write operation)
- Requires gas payment in native token
- Transaction is irreversible once confirmed
- Must have correct ABI and function signature
- Parameters must match exactly (type and order)
- Private key grants transaction signing authority
- Optional value parameter to send native tokens with call

PARAMETERS:
- chain: EVM chain to execute transaction on (required)
  * Must have gas in native token
  * Gas costs vary by chain and function complexity

- contractAddress: Smart contract address (required)
  * Format: 0x followed by 40 hex characters
  * Must be deployed contract
  * Examples: DEX routers, NFT contracts, staking pools

- abi: Contract Application Binary Interface (required)
  * JSON array defining contract interface
  * Must include function being called
  * Get from block explorer or project docs
  * Defines function signature for encoding

- functionName: Name of function to execute (required)
  * Must be state-changing function (not view/pure)
  * Case-sensitive, exact match required
  * Examples: "transfer", "approve", "swap", "stake"

- params: Function parameters array (optional)
  * Must match function signature exactly
  * Correct types and order critical
  * Empty array [] if no parameters
  * Examples: ["0xAddress", "1000"], []

- value: Native token amount to send (optional)
  * In ether units (e.g., "0.1" = 0.1 ETH/POL/etc.)
  * Used for payable functions only
  * Most functions don't need this (default: "0")
  * Examples: "0.1", "1.5", "0"

- privateKey: Transaction signer's private key (required, KEEP SECRET)
  * Format: 0x followed by 64 hex characters
  * Must have gas for transaction
  * Grants full signing authority
  * Never expose, share, or log this value

EXAMPLES:
✅ Stake tokens in DeFi protocol (Polygon):
  {chain: "polygon", contractAddress: "0xStakingContract...", abi: [...], functionName: "stake", params: ["1000000000000000000"], value: "0", privateKey: "0xac0974..."}

✅ Execute DEX swap (Arbitrum):
  {chain: "arbitrum", contractAddress: "0xRouterV2...", abi: [...], functionName: "swapExactTokensForTokens", params: ["1000000", "950000", ["0xToken0", "0xToken1"], "0xRecipient", "1234567890"], privateKey: "0x..."}

✅ Mint NFT with payment (Ethereum):
  {chain: "ethereum", contractAddress: "0xNFT...", abi: [...], functionName: "mint", params: ["1"], value: "0.05", privateKey: "0x..."}

❌ Invalid - insufficient gas:
  {chain: "ethereum", ...} // No ETH for gas

❌ Invalid - wrong parameter types:
  {params: [1000, "0xAddress"]} // Number instead of string

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating transaction success
• chain: Chain where transaction executed
• transactionHash: Transaction hash for tracking
• contractAddress: Contract called
• functionName: Function executed
• from: Sender address (derived from privateKey)
• gasUsed: Gas consumed by transaction
• blockNumber: Block containing transaction
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Not having sufficient gas for transaction
- Wrong ABI (function signature mismatch)
- Incorrect parameter types or order
- Forgetting to approve tokens before swap/transfer
- Using view/pure functions (use evm_call_contract instead)
- Not waiting for transaction confirmation

USE CASES:
- Execute DEX token swaps
- Stake tokens in DeFi protocols
- Mint or transfer NFTs
- Claim rewards from contracts
- Interact with lending protocols
- Call custom contract functions

TRANSACTION FLOW:
1. Check gas balance (evm_get_balance)
2. Approve tokens if needed (evm_approve_token)
3. Encode function call with ABI
4. Sign transaction with private key
5. Broadcast to network
6. Wait for confirmation

GAS ESTIMATION:
- Simple functions: 50,000-100,000 gas
- Complex functions (swaps): 150,000-300,000 gas
- Very complex (multi-operation): 300,000-500,000 gas
- Use evm_estimate_gas before executing

PAYABLE FUNCTIONS:
Functions that accept native tokens (ETH/POL):
- Specify value parameter in ether units
- Contract must mark function as "payable"
- Common in: NFT minting, deposits, purchases
- Example: Mint NFT for 0.05 ETH

NON-PAYABLE FUNCTIONS:
Most functions don't accept native tokens:
- Leave value as "0" or omit
- Use token approvals instead (ERC20)
- Attempting to send value will fail

GETTING CONTRACT ABI:
1. Block explorer (Etherscan/PolygonScan) - verified contracts
2. Project GitHub repository
3. Project documentation
4. npm packages (@uniswap/v2-periphery)

SECURITY NOTES:
- Verify contract address carefully (phishing risk)
- Check function name and parameters
- Test with small amounts first
- Understand what function does before calling
- Monitor transaction on block explorer
- Keep private keys secure

ABI REQUIREMENT:
Full function ABI entry needed:
{
  "name": "transfer",
  "type": "function",
  "stateMutability": "nonpayable",
  "inputs": [
    {"name": "recipient", "type": "address"},
    {"name": "amount", "type": "uint256"}
  ],
  "outputs": [{"name": "", "type": "bool"}]
}

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
                    description: 'Smart contract address (0x...)'
                },
                abi: {
                    type: 'array',
                    description: 'Contract ABI (JSON array)'
                },
                functionName: {
                    type: 'string',
                    description: 'Function name to call'
                },
                params: {
                    type: 'array',
                    description: 'Function parameters (optional)'
                },
                value: {
                    type: 'string',
                    description: 'ETH amount to send with transaction (optional, in ether)'
                },
                privateKey: {
                    type: 'string',
                    description: 'Private key to sign transaction (0x...)'
                }
            },
            required: ['chain', 'contractAddress', 'abi', 'functionName', 'privateKey']
        }
    },
    {
        name: 'evm_get_contract_abi',
        description: `
Get contract ABI from block explorer API or provide guidance on manual retrieval (placeholder implementation).

Attempts to fetch contract ABI automatically from block explorer. For verified contracts, returns full ABI
including all functions, events, and data structures. Currently provides guidance for manual retrieval.

CRITICAL RULES:
- Only works for verified contracts on block explorer
- Unverified contracts don't expose ABI publicly
- Some explorers require API keys for programmatic access
- Manual retrieval often more reliable than API
- ABI is critical for all contract interactions
- This is PLACEHOLDER - may return retrieval guidance instead of ABI

PARAMETERS:
- chain: EVM chain where contract is deployed (required)
  * Each chain has different block explorer
  * API access varies by explorer

- contractAddress: Smart contract address (required)
  * Format: 0x followed by 40 hex characters
  * Contract must be verified on block explorer
  * Examples: DEX routers, token contracts, NFT collections

EXAMPLES:
✅ Get ABI for verified USDC on Polygon:
  {chain: "polygon", contractAddress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"}

✅ Get ABI for Uniswap Router on Ethereum:
  {chain: "ethereum", contractAddress: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"}

✅ Get ABI for verified custom contract (BSC):
  {chain: "bsc", contractAddress: "0xCustomContract..."}

❌ Invalid - unverified contract:
  {contractAddress: "0xUnverified..."} // ABI not available

❌ Invalid - wrong chain:
  {chain: "polygon", contractAddress: "0xEthereumOnly..."} // Contract not on Polygon

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating retrieval success
• chain: Chain queried
• contractAddress: Contract address
• abi: Contract ABI (JSON array) if available
• verified: Boolean indicating if contract is verified
• retrievalMethod: How ABI was obtained (api/manual)
• blockExplorerUrl: URL to view contract on explorer
• manualInstructions: Steps for manual ABI retrieval
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Trying to get ABI for unverified contracts
- Using wrong block explorer for chain
- Not having API key for explorer (if required)
- Confusing contract address with implementation address (proxies)

USE CASES:
- Get ABI before calling contract functions
- Explore contract interface and capabilities
- Verify contract functionality matches documentation
- Decode transaction data
- Build UI for contract interaction

BLOCK EXPLORERS BY CHAIN:
- Ethereum Sepolia: sepolia.etherscan.io
- Polygon Amoy: amoy.polygonscan.com
- Avalanche Fuji: testnet.snowtrace.io
- BSC Testnet: testnet.bscscan.com
- Arbitrum Sepolia: sepolia.arbiscan.io
- Base Sepolia: sepolia.basescan.org
- World Chain: worldchain.explorer.io

MANUAL ABI RETRIEVAL STEPS:
1. Go to block explorer for your chain
2. Enter contract address in search bar
3. Navigate to "Contract" tab
4. Look for "Contract ABI" section (verified contracts only)
5. Copy ABI JSON array
6. Use in evm_call_contract or evm_send_contract_transaction

VERIFICATION STATUS:
Verified contracts show:
- ✅ Green checkmark on explorer
- Source code tab available
- Contract ABI visible
- Compiler settings shown
- Contract name displayed

Unverified contracts show:
- ❌ No verification badge
- Only bytecode visible
- No ABI available
- Must get ABI from project docs

PROXY CONTRACTS:
For proxy patterns (common in upgradeable contracts):
1. Get ABI from implementation contract, not proxy
2. Proxy address for transactions
3. Implementation ABI for function calls
4. Explorer often detects and shows both

ALTERNATIVE ABI SOURCES:
1. Project GitHub repository
2. Project documentation
3. npm packages (@uniswap/v2-core)
4. Etherscan "Read/Write Contract" tab
5. Contract deployment transaction logs

COMMON CONTRACT ABIS:
Standard interfaces often available in libraries:
- ERC20: @openzeppelin/contracts
- ERC721: @openzeppelin/contracts
- ERC1155: @openzeppelin/contracts
- Uniswap V2: @uniswap/v2-core
- Uniswap V3: @uniswap/v3-core

API KEY REQUIREMENTS:
Some explorers require API keys:
- Etherscan: Free tier available
- PolygonScan: Free tier available
- BSCScan: Free tier available
- Others: Check explorer docs

PLACEHOLDER NOTE:
This tool currently provides guidance for manual retrieval.
Full API integration coming in future updates.
For now, use manual retrieval from block explorer.

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
                    description: 'Smart contract address (0x...)'
                }
            },
            required: ['chain', 'contractAddress']
        }
    },
    {
        name: 'evm_decode_contract_data',
        description: `
Decode transaction input data to understand what function was called and with what parameters.

Takes raw hex transaction data and ABI to decode function name and parameters. Essential for understanding
transactions on block explorers, auditing contract interactions, and debugging failed transactions.

CRITICAL RULES:
- Requires correct ABI for contract being decoded
- Data must start with function selector (first 4 bytes)
- Parameters decoded based on ABI parameter types
- Decoding only works if ABI matches contract
- Complex types (tuples, arrays) properly structured in output

PARAMETERS:
- chain: EVM chain context (required)
  * Used for context, doesn't affect decoding
  * Helps identify which chain's transaction

- abi: Contract ABI (required)
  * Must include function being decoded
  * Function selector computed from signature
  * All parameter types must be defined
  * Get from block explorer or project docs

- data: Transaction input data to decode (required)
  * Format: 0x followed by hex characters
  * First 4 bytes: function selector
  * Remaining bytes: encoded parameters
  * Get from transaction details on block explorer

EXAMPLES:
✅ Decode ERC20 transfer transaction:
  {chain: "polygon", abi: [...ERC20_ABI], data: "0xa9059cbb000000000000000000000000742d35cc6634c0532925a3b844bc9e7595f0beb0000000000000000000000000000000000000000000000000de0b6b3a7640000"}

✅ Decode DEX swap transaction:
  {chain: "arbitrum", abi: [...ROUTER_ABI], data: "0x38ed1739..."}

✅ Decode NFT mint transaction:
  {chain: "ethereum", abi: [...NFT_ABI], data: "0xa0712d68..."}

❌ Invalid - wrong ABI:
  {abi: [...ERC721_ABI], data: "0xERC20TransferData"} // ABI mismatch

❌ Invalid - invalid data format:
  {data: "not-hex-data"} // Must be 0x... hex string

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating decoding success
• chain: Chain context
• functionName: Name of function called
• functionSignature: Full function signature
• parameters: Array of decoded parameters with names and values
• methodId: Function selector (first 4 bytes)
• decodedData: Human-readable representation
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Using wrong ABI (from different contract)
- Missing function definition in ABI
- Truncated or malformed data
- Not handling complex parameter types
- Confusing input data with output data

USE CASES:
- Understand what a transaction does before executing
- Audit historical transactions
- Debug failed transactions
- Verify transaction parameters
- Build transaction explorers

FUNCTION SELECTOR:
First 4 bytes of input data:
- Computed from function signature
- Example: transfer(address,uint256)
- Keccak256 hash, first 4 bytes
- Used to identify function being called

DECODING PROCESS:
1. Extract function selector (first 4 bytes)
2. Match selector to function in ABI
3. Extract parameter types from ABI
4. Decode remaining data using types
5. Return function name and parameters

PARAMETER TYPES:
Common Solidity types decoded:
- address: Ethereum addresses
- uint256: Large integers (as strings)
- bytes: Byte arrays
- string: Text strings
- bool: True/false
- arrays: Multiple values
- tuples: Structured data

EXAMPLE DECODED OUTPUT:
{
  functionName: "transfer",
  parameters: [
    {name: "recipient", type: "address", value: "0x742d35..."},
    {name: "amount", type: "uint256", value: "1000000000000000000"}
  ]
}

WHERE TO GET INPUT DATA:
1. Block explorer transaction details
2. Pending transaction before broadcast
3. Transaction receipt logs
4. Wallet transaction history
5. Contract event logs

DEBUGGING FAILED TRANSACTIONS:
1. Get failed transaction hash
2. View on block explorer
3. Copy input data
4. Decode with this tool
5. Understand what was attempted
6. Fix parameters and retry

COMPLEX TYPES:
Arrays and tuples decoded recursively:
- address[]: ["0x...", "0x...", "0x..."]
- (uint256,string): {amount: "100", name: "Token"}
- Nested structures: Full object hierarchy

SECURITY AUDITING:
Use to verify transactions:
- Check recipient addresses
- Verify amounts being transferred
- Confirm function being called
- Detect suspicious patterns
- Audit contract interactions

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: {
                    type: 'string',
                    enum: SUPPORTED_CHAINS,
                    description: 'EVM chain context'
                },
                abi: {
                    type: 'array',
                    description: 'Contract ABI (JSON array)'
                },
                data: {
                    type: 'string',
                    description: 'Transaction input data to decode (0x...)'
                }
            },
            required: ['chain', 'abi', 'data']
        }
    },
    {
        name: 'evm_encode_contract_data',
        description: `
Encode function call into transaction input data for raw transaction construction.

Converts function name and parameters into hex-encoded transaction data. Used for building raw transactions,
batch operations, multi-sig proposals, or when you need transaction data before signing.

CRITICAL RULES:
- Requires correct ABI for function being encoded
- Parameters must match function signature exactly
- Output is hex-encoded transaction input data
- Can be used in raw transactions or eth_sendRawTransaction
- Function selector automatically prepended to encoded parameters

PARAMETERS:
- chain: EVM chain context (required)
  * Used for context, doesn't affect encoding
  * Helps identify target chain

- abi: Contract ABI (required)
  * Must include function being encoded
  * Function signature used for selector computation
  * Parameter types define encoding rules
  * Get from block explorer or project docs

- functionName: Name of function to encode (required)
  * Exact name as in contract
  * Case-sensitive
  * Examples: "transfer", "approve", "swapExactTokensForTokens"

- params: Function parameters array (optional)
  * Must match function signature order and types
  * Correct types critical for proper encoding
  * Empty array [] if no parameters
  * Examples: ["0x742d35...", "1000"], []

EXAMPLES:
✅ Encode ERC20 transfer:
  {chain: "polygon", abi: [...ERC20_ABI], functionName: "transfer", params: ["0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", "1000000000000000000"]}

✅ Encode token approval:
  {chain: "arbitrum", abi: [...], functionName: "approve", params: ["0xSpender...", "115792089237316195423570985008687907853269984665640564039457584007913129639935"]}

✅ Encode function with no parameters:
  {chain: "ethereum", abi: [...], functionName: "totalSupply", params: []}

❌ Invalid - wrong parameter types:
  {params: [1000, "0xAddress"]} // Numbers should be strings

❌ Invalid - parameter count mismatch:
  {functionName: "transfer", params: ["0xAddress"]} // Missing amount parameter

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• success: Boolean indicating encoding success
• chain: Chain context
• functionName: Function being encoded
• functionSignature: Full function signature
• encodedData: Hex-encoded transaction data (0x...)
• methodId: Function selector (first 4 bytes)
• parameters: Original parameters provided
• executionTime: Time taken in milliseconds

COMMON MISTAKES:
- Wrong parameter types (number instead of string)
- Incorrect parameter order
- Missing required parameters
- Using wrong ABI
- Not converting values to proper units

USE CASES:
- Build raw transactions manually
- Prepare multi-sig transaction proposals
- Batch multiple contract calls
- Create transaction data for wallets
- Simulate transactions before signing

ENCODING PROCESS:
1. Compute function selector from signature
2. Encode each parameter by type
3. Concatenate selector + encoded params
4. Return hex string with 0x prefix

FUNCTION SELECTOR:
First 4 bytes of encoded data:
- Keccak256 hash of function signature
- Example: transfer(address,uint256)
- Always 8 hex characters (4 bytes)
- Uniquely identifies function

PARAMETER ENCODING:
Types encoded differently:
- address: 20 bytes, left-padded to 32 bytes
- uint256: 32 bytes, big-endian
- string: Length-prefixed, hex-encoded
- bytes: Length-prefixed, raw bytes
- arrays: Length + elements
- bool: 0x00 (false) or 0x01 (true)

USING ENCODED DATA:
1. Build raw transaction object
2. Set 'data' field to encoded output
3. Set 'to' field to contract address
4. Sign transaction with private key
5. Broadcast with eth_sendRawTransaction

RAW TRANSACTION EXAMPLE:
{
  to: "0xContractAddress",
  data: "0xa9059cbb000000000000000000000000...", // From this tool
  gasLimit: "100000",
  gasPrice: "20000000000",
  nonce: 42,
  chainId: 137
}

MULTI-SIG PROPOSALS:
1. Encode function call (this tool)
2. Create proposal with encoded data
3. Collect signatures from signers
4. Execute multi-sig transaction

BATCH OPERATIONS:
Encode multiple calls:
1. Encode each function call separately
2. Combine encoded data in batch contract
3. Execute all in single transaction

COMPLEX PARAMETERS:
Encoding arrays and tuples:
- address[]: Multiple addresses
- (uint256,string): Structured data
- Nested types: Recursive encoding

VERIFICATION:
After encoding:
1. Decode with evm_decode_contract_data
2. Verify function and parameters correct
3. Double-check before signing

SECURITY NOTES:
- Verify parameters before encoding
- Check function name is correct
- Test with small amounts first
- Understand what function does
- Use on testnet before mainnet

${OS_GUIDANCE}
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: {
                    type: 'string',
                    enum: SUPPORTED_CHAINS,
                    description: 'EVM chain context'
                },
                abi: {
                    type: 'array',
                    description: 'Contract ABI (JSON array)'
                },
                functionName: {
                    type: 'string',
                    description: 'Function name to encode'
                },
                params: {
                    type: 'array',
                    description: 'Function parameters (optional)'
                }
            },
            required: ['chain', 'abi', 'functionName']
        }
    },
    {
        name: 'evm_deploy_contract',
        description: `
Deploy a smart contract from bytecode with constructor arguments.

Creates and deploys a contract to the blockchain using provided bytecode and ABI.
Waits for deployment confirmation and returns the deployed contract address.

CRITICAL RULES:
- Requires sufficient gas for deployment (typically 200k-500k gas)
- Constructor args must match ABI parameter types exactly
- Bytecode must be valid and 0x-prefixed hex string
- Deployer receives all initial state/tokens in contract
- Contract address is deterministic based on deployer + nonce

PARAMETERS:
- chain: Target EVM chain for deployment
- bytecode: Contract bytecode (0x-prefixed hex)
- abi: Contract ABI including constructor definition
- constructorArgs: Constructor parameters (optional, empty array if none)
- privateKey: Deployer's private key (requires gas for deployment)

EXAMPLES:
✅ Deploy simple contract:
  {chain: "polygon", bytecode: "0x608060...", abi: [...], constructorArgs: [], privateKey: "0x..."}

✅ Deploy with constructor args:
  {chain: "ethereum", bytecode: "0x608060...", abi: [...], constructorArgs: ["Token Name", "TKN", 18], privateKey: "0x..."}

❌ Invalid - missing bytecode:
  {chain: "polygon", abi: [...], privateKey: "0x..."}

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• contractAddress: Deployed contract address
• transactionHash: Deployment transaction hash
• deployer: Deployer address (from private key)
• gasUsed: Gas consumed in deployment

COMMON MISTAKES:
- Not having enough gas for deployment
- Wrong constructor arg types or order
- Using malformed bytecode
- Deploying to wrong chain

USE CASES:
- Deploy custom tokens or NFT collections
- Deploy DeFi protocol contracts
- Deploy governance or DAO contracts
- Test contract deployment on testnets

${OS_GUIDANCE}`,
        inputSchema: {
            type: 'object',
            properties: {
                chain: {
                    type: 'string',
                    enum: SUPPORTED_CHAINS,
                    description: 'EVM chain to deploy on'
                },
                bytecode: {
                    type: 'string',
                    description: 'Contract bytecode (0x-prefixed hex)'
                },
                abi: {
                    type: 'array',
                    description: 'Contract ABI for constructor'
                },
                constructorArgs: {
                    type: 'array',
                    description: 'Constructor arguments (optional)'
                },
                privateKey: {
                    type: 'string',
                    description: 'Deployer private key'
                }
            },
            required: ['chain', 'bytecode', 'abi', 'privateKey']
        }
    },
    {
        name: 'evm_encode_function_data',
        description: `
Encode function call into transaction input data for raw transaction construction.

Converts function name and parameters into hex-encoded transaction data. Used for building raw transactions,
batch operations, multi-sig proposals, or when you need transaction data before signing.

CRITICAL RULES:
- Requires correct ABI for function being encoded
- Parameters must match function signature exactly
- Output is hex-encoded transaction input data
- Can be used in raw transactions or eth_sendRawTransaction
- Function selector automatically prepended to encoded parameters

PARAMETERS:
- chain: EVM chain context (required)
- abi: Contract ABI (required)
- functionName: Name of function to encode (required)
- params: Function parameters array (optional)

EXAMPLES:
✅ Encode ERC20 transfer:
  {chain: "polygon", abi: [...ERC20_ABI], functionName: "transfer", params: ["0x742d35Cc...", "1000000000000000000"]}

✅ Encode token approval:
  {chain: "arbitrum", abi: [...], functionName: "approve", params: ["0xSpender...", "115792089237316195423570985008687907853269984665640564039457584007913129639935"]}

✅ Encode function with no parameters:
  {chain: "ethereum", abi: [...], functionName: "totalSupply", params: []}

❌ Invalid - wrong parameter types:
  {params: [1000, "0xAddress"]} // Numbers should be strings

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• encodedData: Hex-encoded transaction data (0x...)
• selector: Function selector (first 4 bytes)
• functionSignature: Full function signature

COMMON MISTAKES:
- Wrong parameter types (number instead of string)
- Incorrect parameter order
- Missing required parameters
- Using wrong ABI
- Not converting values to proper units

USE CASES:
- Build raw transactions manually
- Prepare multi-sig transaction proposals
- Batch multiple contract calls
- Create transaction data for wallets
- Simulate transactions before signing

${OS_GUIDANCE}`,
        inputSchema: {
            type: 'object',
            properties: {
                chain: {
                    type: 'string',
                    enum: SUPPORTED_CHAINS,
                    description: 'EVM chain context'
                },
                abi: {
                    type: 'array',
                    description: 'Contract ABI (JSON array)'
                },
                functionName: {
                    type: 'string',
                    description: 'Function name to encode'
                },
                args: {
                    type: 'array',
                    description: 'Function arguments (optional)'
                }
            },
            required: ['chain', 'abi', 'functionName']
        }
    },
    {
        name: 'evm_decode_function_result',
        description: `
Decode function return data from transaction or call.

Takes hex-encoded return data and decodes it according to the function's return types defined in the ABI.
Essential for interpreting contract call results and transaction outputs.

CRITICAL RULES:
- Requires correct ABI for function being decoded
- Data must be hex-encoded return data (0x-prefixed)
- Returns both formatted (named) and raw (array) results
- Handles BigInt serialization for JSON compatibility
- Function must have return values defined in ABI

PARAMETERS:
- chain: EVM chain context (required)
- abi: Contract ABI (required)
- functionName: Function name that returned this data (required)
- data: Hex-encoded return data to decode (required)

EXAMPLES:
✅ Decode ERC20 balance:
  {chain: "polygon", abi: [...ERC20_ABI], functionName: "balanceOf", data: "0x0000000000000000000000000000000000000000000000000de0b6b3a7640000"}

✅ Decode multiple return values:
  {chain: "ethereum", abi: [...], functionName: "getReserves", data: "0x..."}

✅ Decode struct returns:
  {chain: "arbitrum", abi: [...], functionName: "getPoolInfo", data: "0x..."}

❌ Invalid - wrong function name:
  {functionName: "wrongFunction", data: "0x..."} // ABI mismatch

${CHAIN_GUIDANCE}

OUTPUT STRUCTURE:
• decodedResult: Formatted result with named outputs
• rawResult: Raw array of decoded values
• functionName: Function that was decoded

COMMON MISTAKES:
- Using wrong ABI for decoding
- Mismatched function name
- Truncated or malformed data
- Not handling BigInt values properly

USE CASES:
- Interpret contract call results
- Decode transaction return data
- Parse multicall results
- Debug contract interactions
- Extract values from view function calls

${OS_GUIDANCE}`,
        inputSchema: {
            type: 'object',
            properties: {
                chain: {
                    type: 'string',
                    enum: SUPPORTED_CHAINS,
                    description: 'EVM chain context'
                },
                abi: {
                    type: 'array',
                    description: 'Contract ABI'
                },
                functionName: {
                    type: 'string',
                    description: 'Function name that returned this data'
                },
                data: {
                    type: 'string',
                    description: 'Hex-encoded return data to decode'
                }
            },
            required: ['chain', 'abi', 'functionName', 'data']
        }
    }
];
