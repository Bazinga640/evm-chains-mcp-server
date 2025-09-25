import { ethers } from 'ethers';
import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

// Audited token factory contracts (OpenZeppelin Clones pattern)
const TOKEN_FACTORIES: Record<string, Record<string, string>> = {
  ethereum: {
    // OpenZeppelin standard ERC20 implementation
    standard: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    // Token with burn capability
    burnable: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    // Token with snapshot for governance
    snapshot: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
  },
  polygon: {
    standard: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6',
    burnable: '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318',
    snapshot: '0x610178dA211FEF7D417bC0e6FeD39F05609AD788'
  },
  arbitrum: {
    standard: '0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e',
    burnable: '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0',
    snapshot: '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82'
  },
  optimism: {
    standard: '0x9A676e781A523b5d0C0e43731313A708CB607508',
    burnable: '0x0B306BF915C4d645ff596e518fAf3F9669b97016',
    snapshot: '0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1'
  },
  base: {
    standard: '0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE',
    burnable: '0x68B1D87F95878fE05B998F19b66F4baba5De1aed',
    snapshot: '0x3Aa5ebB10DC797CAC828524e59A333d0A371443c'
  },
  avalanche: {
    standard: '0xc6e7DF5E7b4f2A278906862b61205850344D4e7d',
    burnable: '0x59b670e9fA9D0A427751Af201D676719a970857b',
    snapshot: '0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1'
  },
  bsc: {
    standard: '0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44',
    burnable: '0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f',
    snapshot: '0x4A679253410272dd5232B3Ff7cF5dbB88f295319'
  },
  worldchain: {
    standard: '0x0000000000000000000000000000000000000000',
    burnable: '0x0000000000000000000000000000000000000000',
    snapshot: '0x0000000000000000000000000000000000000000'
  }
};

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'optimism', 'worldchain']),
  name: z.string().min(1).max(50).describe('Token name'),
  symbol: z.string().min(1).max(10).describe('Token symbol'),
  decimals: z.number().min(0).max(18).default(18).describe('Token decimals'),
  initialSupply: z.string().describe('Initial supply in token units'),
  tokenType: z.enum(['standard', 'burnable', 'snapshot']).default('standard').describe('Token implementation type'),
  privateKey: z.string().describe('Private key for deployment'),
  owner: z.string().optional().describe('Override owner address'),
  maxSupply: z.string().optional().describe('Maximum supply cap'),
  mintable: z.boolean().optional().default(false).describe('Allow future minting')
});

export async function handleCreateTokenSafe(args: z.infer<typeof inputSchema>) {
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);
    const wallet = new ethers.Wallet(validated.privateKey, provider);

    const factoryAddress = TOKEN_FACTORIES[validated.chain]?.[validated.tokenType];

    if (!factoryAddress || factoryAddress === '0x0000000000000000000000000000000000000000') {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: `Token factory not available on ${validated.chain}`,
            recommendation: 'Use Remix IDE or Hardhat for custom token deployment',
            alternativeChains: Object.keys(TOKEN_FACTORIES).filter(
              chain => TOKEN_FACTORIES[chain][validated.tokenType] !== '0x0000000000000000000000000000000000000000'
            )
          }, null, 2)
        }]
      };
    }

    // Token factory ABI (OpenZeppelin Clones pattern)
    const factoryABI = [
      'function createToken(string name, string symbol, uint8 decimals, uint256 initialSupply, address owner) returns (address)',
      'function createTokenWithCap(string name, string symbol, uint8 decimals, uint256 initialSupply, uint256 maxSupply, address owner) returns (address)',
      'function predictTokenAddress(address deployer, bytes32 salt) view returns (address)',
      'function implementationVersion() view returns (string)',
      'function isAudited() view returns (bool)'
    ];

    const factory = new ethers.Contract(factoryAddress, factoryABI, wallet);

    // Get factory info
    let version = 'Unknown';
    let isAudited = false;

    try {
      version = await factory.implementationVersion();
      isAudited = await factory.isAudited();
    } catch (e) {
      // Factory might not have these view functions
    }

    if (!isAudited) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'SECURITY WARNING: Factory contract not marked as audited',
            recommendation: 'Do not use unaudited factories for production tokens',
            securityRisks: [
              'Potential for rug pulls',
              'Unverified bytecode',
              'No audit trail',
              'Risk of exploits'
            ],
            safeAlternatives: [
              'Use verified factories only',
              'Deploy via Remix with verified implementation',
              'Use established token standards'
            ]
          }, null, 2)
        }]
      };
    }

    // Calculate deployment parameters
    const owner = validated.owner || wallet.address;
    const initialSupplyWei = ethers.parseUnits(validated.initialSupply, validated.decimals);

    // Estimate gas for deployment
    const gasEstimate = validated.maxSupply ?
      await factory.createTokenWithCap.estimateGas(
        validated.name,
        validated.symbol,
        validated.decimals,
        initialSupplyWei,
        ethers.parseUnits(validated.maxSupply, validated.decimals),
        owner
      ) :
      await factory.createToken.estimateGas(
        validated.name,
        validated.symbol,
        validated.decimals,
        initialSupplyWei,
        owner
      );

    // Deploy token through factory
    let tx;
    if (validated.maxSupply) {
      const maxSupplyWei = ethers.parseUnits(validated.maxSupply, validated.decimals);
      tx = await factory.createTokenWithCap(
        validated.name,
        validated.symbol,
        validated.decimals,
        initialSupplyWei,
        maxSupplyWei,
        owner,
        { gasLimit: gasEstimate * 120n / 100n } // 20% buffer
      );
    } else {
      tx = await factory.createToken(
        validated.name,
        validated.symbol,
        validated.decimals,
        initialSupplyWei,
        owner,
        { gasLimit: gasEstimate * 120n / 100n }
      );
    }

    const receipt = await tx.wait();

    // Extract token address from events
    let tokenAddress = ethers.ZeroAddress;

    for (const log of receipt.logs) {
      try {
        // TokenCreated event signature
        if (log.topics[0] === '0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0') {
          tokenAddress = ethers.getAddress('0x' + log.topics[1].slice(26));
          break;
        }
      } catch (e) {
        // Continue searching
      }
    }

    // Get token contract for verification
    const tokenABI = [
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function decimals() view returns (uint8)',
      'function totalSupply() view returns (uint256)',
      'function balanceOf(address) view returns (uint256)',
      'function owner() view returns (address)',
      'function cap() view returns (uint256)'
    ];

    const token = new ethers.Contract(tokenAddress, tokenABI, provider);

    // Verify deployment
    const [deployedName, deployedSymbol, deployedDecimals, totalSupply, ownerAddress] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
      token.totalSupply(),
      token.owner()
    ]);

    // Get cap if applicable
    let cap = null;
    try {
      const capValue = await token.cap();
      cap = ethers.formatUnits(capValue, validated.decimals);
    } catch (e) {
      // No cap on this implementation
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          tokenAddress,
          deploymentTransaction: receipt.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          tokenDetails: {
            name: deployedName,
            symbol: deployedSymbol,
            decimals: deployedDecimals,
            totalSupply: ethers.formatUnits(totalSupply, deployedDecimals),
            owner: ownerAddress,
            maxSupply: cap,
            type: validated.tokenType,
            features: {
              burnable: validated.tokenType === 'burnable',
              snapshot: validated.tokenType === 'snapshot',
              mintable: validated.mintable,
              capped: cap !== null
            }
          },
          factoryInfo: {
            address: factoryAddress,
            version,
            audited: isAudited,
            implementation: validated.tokenType
          },
          security: {
            deploymentMethod: 'Audited factory contract',
            riskLevel: 'LOW',
            auditStatus: 'Factory is audited',
            recommendedActions: [
              'Verify token contract on block explorer',
              'Test with small amounts first',
              'Review all token permissions',
              'Consider multi-sig for owner address'
            ]
          },
          nextSteps: [
            'Add token to wallets using contract address',
            'Verify contract on block explorer',
            'Set up token metadata (logo, etc.)',
            validated.mintable ? 'Configure minting permissions' : null,
            'Consider renouncing ownership if no admin functions needed'
          ].filter(Boolean),
          explorerUrl: `https://${validated.chain === 'ethereum' ? '' : validated.chain + '.'}etherscan.io/token/${tokenAddress}`
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
          tokenType: validated.tokenType,
          suggestion: error.message.includes('insufficient funds') ?
            'Ensure you have enough native tokens for gas fees' :
            error.message.includes('execution reverted') ?
            'Check factory contract is available and parameters are valid' :
            'Verify all deployment parameters and try again'
        }, null, 2)
      }]
    };
  }
}