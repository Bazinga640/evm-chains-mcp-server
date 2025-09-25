import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SUPPORTED_CHAINS } from '../constants/guidance.js';

export const ADVANCED_DEFI_TOOLS: Tool[] = [
    {
        name: 'evm_execute_flash_loan',
        description: `
Execute flash loan from Aave, dYdX, Balancer, or other providers.

Borrow large amounts without collateral, execute arbitrage/liquidations, repay in same transaction.
Validates atomicity - transaction reverts if loan isn't repaid.

PARAMETERS:
- chain: Target EVM chain
- provider: Flash loan provider (aave, dydx, balancer, uniswapV3, etc.) - optional, auto-selects best
- asset: Token address to borrow
- amount: Amount to borrow in token units
- callbackContract: Your contract that receives/repays loan
- callbackData: Encoded data for callback (optional)
- privateKey: Private key for signing
- profitEstimate: Expected profit for cost analysis (optional)

FLASH LOAN PROVIDERS:
• Aave: 0.09% fee, most chains
• dYdX: 0% fee, Ethereum only
• Balancer: 0% fee, select chains
• Uniswap V3: 0.05-0.3% fee

ATOMICITY GUARANTEE:
• Pre-flight gas estimation validates repayment
• Transaction fails if callback doesn't repay
• No risk of unpaid flash loans

Returns tx hash, fees paid, and profit analysis.
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                provider: {
                    type: 'string',
                    enum: ['aave', 'dydx', 'balancer', 'uniswapV3', 'venus', 'pancakeswap', 'benqi', 'quickswap', 'radiant', 'biswap'],
                    description: 'Flash loan provider (optional, auto-selects)'
                },
                asset: { type: 'string', description: 'Token address to borrow' },
                amount: { type: 'string', description: 'Borrow amount in token units' },
                callbackContract: { type: 'string', description: 'Contract that receives and repays loan' },
                callbackData: { type: 'string', description: 'Encoded data for callback' },
                privateKey: { type: 'string', description: 'Private key for signing' },
                profitEstimate: { type: 'string', description: 'Expected profit in token units' }
            },
            required: ['chain', 'asset', 'amount', 'callbackContract', 'privateKey']
        }
    },
    {
        name: 'evm_get_impermanent_loss',
        description: `
Calculate impermanent loss for liquidity providers.

Compares current LP position value vs holding assets separately.
Essential for LP risk management.

PARAMETERS:
- chain: Target EVM chain
- token0: { symbol, initialPrice, currentPrice, amount }
- token1: { symbol, initialPrice, currentPrice, amount }
- poolAddress: Pool address for live data (optional)
- includeFeesEarned: Include estimated fees in calculation (optional)
- feeRate: Pool fee rate as percent (e.g., 0.3 for 0.3%) (optional)

CALCULATION:
• Compares LP value vs holding tokens
• Accounts for price divergence
• Includes fee earnings offset
• Shows IL percentage

Returns IL amount, percentage, fee earnings, and net position.
`.trim(),
        inputSchema: {
            type: 'object',
            properties: {
                chain: { type: 'string', enum: SUPPORTED_CHAINS },
                token0: {
                    type: 'object',
                    properties: {
                        symbol: { type: 'string' },
                        initialPrice: { type: 'string', description: 'Initial price when liquidity was added' },
                        currentPrice: { type: 'string', description: 'Current price of token' },
                        amount: { type: 'string', description: 'Amount of token0 in pool' }
                    },
                    required: ['symbol', 'initialPrice', 'currentPrice', 'amount']
                },
                token1: {
                    type: 'object',
                    properties: {
                        symbol: { type: 'string' },
                        initialPrice: { type: 'string', description: 'Initial price when liquidity was added' },
                        currentPrice: { type: 'string', description: 'Current price of token' },
                        amount: { type: 'string', description: 'Amount of token1 in pool' }
                    },
                    required: ['symbol', 'initialPrice', 'currentPrice', 'amount']
                },
                poolAddress: { type: 'string', description: 'Pool address for live data (optional)' },
                includeFeesEarned: { type: 'boolean', description: 'Include estimated fees in calculation' },
                feeRate: { type: 'number', description: 'Pool fee rate (e.g., 0.3 for 0.3%)' }
            },
            required: ['chain', 'token0', 'token1']
        }
    }
];
