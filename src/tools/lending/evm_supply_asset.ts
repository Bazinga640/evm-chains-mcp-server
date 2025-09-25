import { ethers } from 'ethers';
import { z } from 'zod';
import { getClientManager } from '../../client-manager.js';

// Wrapped native token addresses (WETH, WAVAX, WBNB, etc.) for testnets
const WRAPPED_NATIVE: Record<string, string> = {
  ethereum: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', // WETH on Sepolia
  polygon: '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889', // WMATIC/WPOL on Amoy
  avalanche: '0xd00ae08403B9bbb9124bB305C09058E32C39A48c', // WAVAX on Fuji
  bsc: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', // WBNB on BSC Testnet
  arbitrum: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73', // WETH on Arbitrum Sepolia
  base: '0x4200000000000000000000000000000000000006', // WETH on Base Sepolia
  worldchain: '0x0000000000000000000000000000000000000000'  // Not available yet
};

// Native token markers (commonly used to indicate native asset)
const NATIVE_TOKEN_MARKERS = [
  '0x0000000000000000000000000000000000000000',
  '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
];

// Lending protocol addresses by chain (TESTNET ADDRESSES)
const LENDING_PROTOCOLS: Record<string, Record<string, string>> = {
  ethereum: {
    aave: '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951', // Aave V3 Sepolia
    compound: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
    euler: '0x27182842E098f60e3D576794A5bFFb0777E025d3'
  },
  polygon: {
    aave: '0x6C9fB0D5bD9429eb9Cd96B85B81d872281771E6B', // Aave V3 Amoy
    qidao: '0xa3Fa99A148fA48D14Ed51d610c367C61876997F1'
  },
  avalanche: {
    aave: '0xb47673b7a73D78743AFF1487AF69dBB5763F00cA', // Aave V3 Fuji
    benqi: '0x486Af39519B6dBF40aE0F5CF27D31dF9DD870E87'
  },
  bsc: {
    venus: '0x94d1820b2D1c7c7452A163983Dc888CEC546b77D', // Venus BSC Testnet
    alpaca: '0xA625AB01B08ce023B2a342Dbb12a16f2C8489A8F'
  },
  arbitrum: {
    aave: '0xBfC91D59fdAA134A4ED45f7B584cAf96D7792Eff', // Aave V3 Arbitrum Sepolia
    radiant: '0xF4B1486DD74D07706052A33d31d7c0AAFD0659E1'
  },
  base: {
    aave: '0x18Cd890F4e23422DC4aa8C2D6E0Bd3F3bD8873B8',
    moonwell: '0x70778cfcFC475c7eA0f24cC625Baf6EaE475D0c9'
  },
  worldchain: {
    native: '0x0000000000000000000000000000000000000000'
  }
};

const LENDING_ENABLED =
  process.env.ENABLE_TESTNET_LENDING === 'true';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  protocol: z.enum(['aave', 'compound', 'venus', 'benqi', 'radiant', 'moonwell', 'alpaca', 'qidao', 'euler']),
  asset: z.string().describe('Token address to supply'),
  amount: z.string().describe('Amount to supply'),
  onBehalfOf: z.string().optional().describe('Address to supply on behalf of'),
  privateKey: z.string().describe('Private key for transaction'),
  referralCode: z.number().optional().default(0).describe('Referral code for rewards')
});

export async function handleSupplyAsset(args: z.infer<typeof inputSchema>) {
  const validated = inputSchema.parse(args);

  if (!LENDING_ENABLED) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: 'Lending tools are disabled on the testnet MCP server.',
          reason: 'Protocols such as Aave, Compound, and Venus only support production lending on mainnet deployments.',
          chain: validated.chain,
          environment: 'testnet',
          guidance: [
            'Deploy the mainnet EVM Chains MCP server or set ENABLE_TESTNET_LENDING=true (with proper test deployments) to enable this feature.',
            'For testing, interact directly with your own test contracts via evm_send_contract_transaction.'
          ]
        }, null, 2)
      }]
    };
  }

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);
    const wallet = new ethers.Wallet(validated.privateKey, provider);

    const protocolAddress = LENDING_PROTOCOLS[validated.chain]?.[validated.protocol];

    if (!protocolAddress || protocolAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error(`Lending protocol ${validated.protocol} not available on ${validated.chain}`);
    }

    // Lending pool ABI
    const lendingABI = [
      'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
      'function deposit(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
      'function mint(uint256 mintAmount) returns (uint256)',
      'function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
      'function getReserveData(address asset) view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))'
    ];

    const lendingPool = new ethers.Contract(protocolAddress, lendingABI, wallet);

    // Check if asset is native token (ETH, AVAX, BNB, etc.)
    const isNativeAsset = NATIVE_TOKEN_MARKERS.includes(validated.asset.toLowerCase());
    let actualAsset = validated.asset;
    let wasWrapped = false;

    // If native asset, wrap it to WETH/WAVAX/WBNB
    if (isNativeAsset) {
      const wrappedAddress = WRAPPED_NATIVE[validated.chain];
      if (!wrappedAddress || wrappedAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error(`Native asset wrapping not available on ${validated.chain}. Use wrapped token address directly.`);
      }

      // Wrap native asset (deposit ETH → get WETH)
      const wethContract = new ethers.Contract(
        wrappedAddress,
        [
          'function deposit() payable',
          'function symbol() view returns (string)',
          'function decimals() view returns (uint8)',
          'function approve(address spender, uint256 amount) returns (bool)'
        ],
        wallet
      );

      const amountWei = ethers.parseEther(validated.amount); // Native tokens always 18 decimals

      // Deposit native token to get wrapped version
      const wrapTx = await wethContract.deposit({ value: amountWei });
      await wrapTx.wait();

      actualAsset = wrappedAddress;
      wasWrapped = true;
    }

    // Get token info (now safe to call even if it was native)
    const tokenContract = new ethers.Contract(
      actualAsset,
      [
        'function approve(address spender, uint256 amount) returns (bool)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)'
      ],
      wallet
    );

    const decimals = await tokenContract.decimals.staticCall();
    const symbol = await tokenContract.symbol.staticCall();
    const amountWei = wasWrapped ? ethers.parseEther(validated.amount) : ethers.parseUnits(validated.amount, decimals);

    // Approve lending protocol
    const approveTx = await tokenContract.approve(protocolAddress, amountWei);
    await approveTx.wait();

    // Supply to lending protocol (use wrapped asset if native was wrapped)
    const onBehalfOf = validated.onBehalfOf || wallet.address;
    let supplyTx;

    if (validated.protocol === 'aave' || validated.protocol === 'radiant') {
      supplyTx = await lendingPool.supply(
        actualAsset,  // Use wrapped address if native asset was wrapped
        amountWei,
        onBehalfOf,
        validated.referralCode
      );
    } else if (validated.protocol === 'compound') {
      // Compound uses mint
      supplyTx = await lendingPool.mint(amountWei);
    } else {
      // Generic deposit method
      supplyTx = await lendingPool.deposit(
        actualAsset,  // Use wrapped address if native asset was wrapped
        amountWei,
        onBehalfOf,
        validated.referralCode
      );
    }

    const receipt = await supplyTx.wait();

    // Get updated account data using staticCall (view function)
    const accountData = await lendingPool.getUserAccountData.staticCall(onBehalfOf);

    // Get reserve data for APY
    let supplyAPY = '0';
    try {
      const reserveData = await lendingPool.getReserveData.staticCall(actualAsset);  // Use wrapped asset
      // Convert ray (27 decimals) to percentage
      supplyAPY = (Number(reserveData.currentLiquidityRate) / 1e25).toFixed(2);
    } catch (e) {
      // Some protocols don't have getReserveData
      supplyAPY = 'Variable (check protocol)';
    }

    // Calculate health factor
    const healthFactor = accountData.healthFactor ?
      ethers.formatUnits(accountData.healthFactor, 18) : 'N/A';

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          protocol: validated.protocol,
          originalAsset: validated.asset,
          actualAsset,
          assetSymbol: symbol,
          amountSupplied: validated.amount,
          nativeAssetWrapped: wasWrapped,
          wrappingInfo: wasWrapped ? {
            note: `Native asset automatically wrapped to ${symbol} before supplying`,
            wrappedTokenAddress: actualAsset,
            originalAddress: validated.asset
          } : undefined,
          onBehalfOf,
          transactionHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          accountData: {
            totalCollateral: ethers.formatUnits(accountData.totalCollateralBase, 8),
            totalDebt: ethers.formatUnits(accountData.totalDebtBase, 8),
            availableBorrows: ethers.formatUnits(accountData.availableBorrowsBase, 8),
            healthFactor,
            ltv: (Number(accountData.ltv) / 100).toFixed(2) + '%'
          },
          supplyAPY: supplyAPY + '%',
          status: wasWrapped ?
            `Native asset wrapped and successfully supplied to ${validated.protocol}` :
            'Asset successfully supplied',
          aTokenReceived: `You received interest-bearing a${symbol} tokens`,
          nextSteps: [
            'Monitor your collateral and health factor',
            'You can now borrow against this collateral',
            wasWrapped ? `⚠️  Your native asset was wrapped to ${symbol}` : 'Track your APY earnings'
          ]
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
          protocol: validated.protocol,
          asset: validated.asset,
          troubleshooting: [
            'Check you have sufficient balance of the asset',
            'Verify the asset is supported by the lending protocol',
            'If using native asset (ETH/AVAX/BNB), ensure wrapping is available',
            'Check protocol address is correct for TESTNET',
            'Ensure you have enough native tokens for gas fees',
            `For native assets, use: ${WRAPPED_NATIVE[validated.chain] || 'wrapped token address'}`
          ],
          supportedWrappedTokens: WRAPPED_NATIVE,
          nativeTokenMarkers: NATIVE_TOKEN_MARKERS
        }, null, 2)
      }]
    };
  }
}
