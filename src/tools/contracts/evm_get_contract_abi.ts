/**
 * Get contract ABI from block explorer
 *
 * Fetches verified contract ABI from blockchain explorers (Etherscan, Polygonscan, etc.)
 * Uses public API endpoints - no API key required for basic usage
 */

import { getClientManager } from '../../client-manager.js';

// Block explorer API endpoints for testnets
const EXPLORER_API_URLS: Record<string, string> = {
  ethereum: 'https://api-sepolia.etherscan.io/api',
  polygon: 'https://api-amoy.polygonscan.com/api',
  avalanche: 'https://api-testnet.snowtrace.io/api',
  bsc: 'https://api-testnet.bscscan.com/api',
  arbitrum: 'https://api-sepolia.arbiscan.io/api',
  base: 'https://api-sepolia.basescan.org/api',
  worldchain: 'https://worldchain-sepolia.explorer.alchemy.com/api' // May not support ABI API
};

export async function handleGetContractABI(args: {
  chain: string;
  contractAddress: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();
  const clientManager = getClientManager();

  try {
    if (!clientManager.isChainSupported(args.chain)) {
      throw new Error(`Unsupported chain: ${args.chain}`);
    }

    const config = clientManager.getChainConfig(args.chain);
    const contractAddress = clientManager.getChecksumAddress(args.contractAddress);

    // Get explorer API URL
    const apiUrl = EXPLORER_API_URLS[args.chain];
    if (!apiUrl) {
      throw new Error(`Block explorer API not available for ${args.chain}`);
    }

    // Fetch ABI from explorer API
    // Using public endpoint (no API key) - rate limited but free
    const url = `${apiUrl}?module=contract&action=getabi&address=${contractAddress}`;

    const response = await fetch(url);
    const data = await response.json();

    // Check if request was successful
    if (data.status !== '1') {
      // Contract not verified or not found
      const errorResponse = {
        success: false,
        chain: args.chain,
        network: config.name,
        contract: contractAddress,
        error: data.result || 'Contract not verified or ABI not available',
        note: 'Contract must be verified on block explorer to fetch ABI',
        explorerUrl: clientManager.getExplorerUrl(args.chain, contractAddress),
        troubleshooting: {
          'Contract not verified': 'Verify contract source code on block explorer first',
          'Invalid address': 'Check that contract address is correct and deployed',
          'Rate limit': 'Public API may be rate limited - try again in a few seconds',
          'Manual workaround': `Visit ${clientManager.getExplorerUrl(args.chain, contractAddress)} to get ABI manually`
        },
        executionTime: `${Date.now() - startTime}ms`
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(errorResponse, null, 2)
        }]
      };
    }

    // Parse ABI (it's returned as a JSON string)
    const abi = JSON.parse(data.result);

    // Analyze ABI for useful metadata
    const functions = abi.filter((item: any) => item.type === 'function');
    const events = abi.filter((item: any) => item.type === 'event');
    const constructor = abi.find((item: any) => item.type === 'constructor');

    const readFunctions = functions.filter((f: any) =>
      f.stateMutability === 'view' || f.stateMutability === 'pure'
    );
    const writeFunctions = functions.filter((f: any) =>
      f.stateMutability !== 'view' && f.stateMutability !== 'pure'
    );

    const successResponse = {
      success: true,
      chain: args.chain,
      network: config.name,
      contract: contractAddress,
      abi,
      metadata: {
        totalFunctions: functions.length,
        readFunctions: readFunctions.length,
        writeFunctions: writeFunctions.length,
        events: events.length,
        hasConstructor: !!constructor,
        contractType: detectContractType(abi)
      },
      functionSummary: {
        read: readFunctions.map((f: any) => f.name).slice(0, 10),
        write: writeFunctions.map((f: any) => f.name).slice(0, 10)
      },
      explorerUrl: clientManager.getExplorerUrl(args.chain, contractAddress),
      usage: [
        'Use this ABI with evm_call_contract for read operations',
        'Use with evm_send_contract_transaction for write operations',
        'Use with evm_encode_contract_data to encode function calls',
        'Use with evm_decode_contract_data to decode transaction data'
      ],
      executionTime: `${Date.now() - startTime}ms`
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(successResponse, null, 2)
      }]
    };
  } catch (error: any) {
    const errorResponse = {
      success: false,
      error: error.message,
      chain: args.chain,
      contractAddress: args.contractAddress,
      timestamp: new Date().toISOString(),
      executionTime: `${Date.now() - startTime}ms`,
      troubleshooting: {
        'Network error': 'Check internet connection and try again',
        'Invalid JSON': 'Contract ABI may be malformed on explorer',
        'API unavailable': 'Block explorer API may be down - try again later'
      }
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(errorResponse, null, 2)
      }]
    };
  }
}

/**
 * Detect contract type based on ABI function signatures
 */
function detectContractType(abi: any[]): string {
  const functionNames = abi
    .filter(item => item.type === 'function')
    .map(item => item.name?.toLowerCase())
    .filter(Boolean);

  // Check for ERC-20
  const hasERC20 = ['transfer', 'approve', 'transferfrom', 'balanceof', 'totalsupply']
    .every(fn => functionNames.includes(fn));
  if (hasERC20) return 'ERC-20 Token';

  // Check for ERC-721
  const hasERC721 = ['safetransferfrom', 'approve', 'setapprovalforall', 'ownerof']
    .every(fn => functionNames.includes(fn));
  if (hasERC721) return 'ERC-721 NFT';

  // Check for ERC-1155
  const hasERC1155 = ['safetransferfrom', 'safebatchtransferfrom', 'balanceofbatch']
    .every(fn => functionNames.includes(fn));
  if (hasERC1155) return 'ERC-1155 Multi-Token';

  // Check for common patterns
  if (functionNames.includes('mint')) return 'Mintable Contract';
  if (functionNames.includes('swap')) return 'DEX/Swap Contract';
  if (functionNames.includes('stake')) return 'Staking Contract';
  if (functionNames.includes('borrow') || functionNames.includes('lend')) return 'Lending Contract';

  return 'Custom Contract';
}
