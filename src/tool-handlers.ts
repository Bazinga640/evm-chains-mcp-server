/**
 * Tool Handlers Registry
 *
 * Centralized mapping of tool names to handler functions
 * Extracted from index.ts to comply with MBSS v3.0 architecture requirements
 */

import { handleGetBalance } from './tools/core/evm_get_balance.js';
import { handleGetTransaction } from './tools/core/evm_get_transaction.js';
import { handleGetBlock } from './tools/core/evm_get_block.js';
import { handleValidateAddress } from './tools/core/evm_validate_address.js';
import { handleGetChainInfo } from './tools/core/evm_get_chain_info.js';
import { handleGetAccountInfo } from './tools/core/evm_get_account_info.js';
import { handleGetTransactionHistory } from './tools/core/evm_get_transaction_history.js';
import { handleSendTransaction } from './tools/core/evm_send_transaction.js';
import { handleSendNativeTransfer } from './tools/core/evm_send_native_transfer.js';
import { handleGetGasPrice } from './tools/core/evm_get_gas_price.js';
import { handleEstimateGas } from './tools/core/evm_estimate_gas.js';
import { handleCreateWallet } from './tools/wallet/evm_create_wallet.js';
import { handleImportWallet } from './tools/wallet/evm_import_wallet.js';
import { handleGenerateAddress } from './tools/wallet/evm_generate_address.js';
import { handleGetWalletInfo } from './tools/wallet/evm_get_wallet_info.js';
import { handleSignMessage } from './tools/wallet/evm_sign_message.js';
import { handleGetTokenBalance } from './tools/tokens/evm_get_token_balance.js';
import { handleGetTokenInfo } from './tools/tokens/evm_get_token_info.js';
import { handleTransferToken } from './tools/tokens/evm_transfer_token.js';
import { handleApproveToken } from './tools/tokens/evm_approve_token.js';
import { handleGetTokenAllowance } from './tools/tokens/evm_get_token_allowance.js';
import { handleDeployToken } from './tools/tokens/evm_deploy_token.js';
import { handleMintToken } from './tools/tokens/evm_mint_token.js';
import { handleBurnToken } from './tools/tokens/evm_burn_token.js';
import { handleGetTokenDecimals } from './tools/tokens/evm_get_token_decimals.js';
import { handleGetTokenName } from './tools/tokens/evm_get_token_name.js';
import { handleGetTokenSymbol } from './tools/tokens/evm_get_token_symbol.js';
import { handleGetTokenTotalSupply } from './tools/tokens/evm_get_token_total_supply.js';

// JSON-RPC Wrapper Tool Imports
import { handleGetBlockNumber } from './tools/core/evm_get_block_number.js';
import { handleGetChainId } from './tools/core/evm_get_chain_id.js';
import { handleGetCode } from './tools/core/evm_get_code.js';
import { handleGetStorageAt } from './tools/core/evm_get_storage_at.js';
import { handleGetLogs } from './tools/core/evm_get_logs.js';
import { handleGetTransactionCount } from './tools/core/evm_get_transaction_count.js';
import { handleGetTransactionReceipt } from './tools/core/evm_get_transaction_receipt.js';
import { handleGetFeeHistory } from './tools/core/evm_get_fee_history.js';
import { handleCall } from './tools/core/evm_call.js';

// Staking Tool Imports
import { handleStakeTokens } from './tools/staking/evm_stake_tokens.js';
import { handleGetStakingRewards } from './tools/staking/evm_get_staking_rewards.js';

// MEV Protection Tool Imports
import { handleSendPrivateTransaction } from './tools/mev/evm_send_private_transaction.js';

// Flash Loan Tool Imports
import { handleExecuteFlashLoan } from './tools/defi/evm_execute_flash_loan.js';

// Advanced DeFi Tool Imports
import { handleGetImpermanentLoss } from './tools/defi/evm_get_impermanent_loss.js';

// Yield Farming Tool Imports
import { handleStakeLp } from './tools/defi/evm_stake_lp.js';
import { handleUnstakeLp } from './tools/defi/evm_unstake_lp.js';
import { handleCompoundRewards } from './tools/defi/evm_compound_rewards.js';
import { handleGetApy } from './tools/defi/evm_get_apy.js';

// MEV Analysis Tool Imports
import { handleDetectSandwich } from './tools/mev/evm_detect_sandwich.js';
import { handleCalculateArbitrage } from './tools/mev/evm_calculate_arbitrage.js';
import { handleSimulateBundle } from './tools/mev/evm_simulate_bundle.js';

// Mempool Tool Imports
import { handleGetMempoolInfo } from './tools/mempool/evm_get_mempool_info.js';

// Bridge Tool Imports
import { handleBridgeTokens } from './tools/bridge/evm_bridge_tokens.js';
import { handleGetBridgeStatus } from './tools/bridge/evm_get_bridge_status.js';
import { handleEstimateBridgeFee } from './tools/bridge/evm_estimate_bridge_fee.js';
import { handleFindBridgeRoutes } from './tools/bridge/evm_find_bridge_routes.js';
import { handleTrackBridgeProgress } from './tools/bridge/evm_track_bridge_progress.js';

// Governance Tool Imports
import { handleCastVote } from './tools/governance/evm_cast_vote.js';

// Event Tool Imports
import { handleFilterLogs } from './tools/events/evm_filter_logs.js';

// Lending Tool Imports
import { handleSupplyAsset } from './tools/lending/evm_supply_asset.js';

// Oracle Tool Imports
import { handleGetPriceFeed } from './tools/oracle/evm_get_price_feed.js';

// Batch Tool Imports
import { handleMulticall } from './tools/batch/evm_multicall.js';

// Safe Token Factory Import
import { handleCreateTokenSafe } from './tools/tokens/evm_create_token_safe.js';

// Gasless Transaction Imports
import { handleGeneratePermit } from './tools/gasless/evm_generate_permit.js';
import { handleSignTypedData } from './tools/gasless/evm_sign_typed_data.js';

// ENS Tool Imports
import { handleResolveEns } from './tools/ens/evm_resolve_ens.js';
import { handleReverseEnsLookup } from './tools/ens/evm_reverse_ens_lookup.js';

// Token Streaming Import
import { handleCreateTokenStream } from './tools/streaming/evm_create_token_stream.js';

import { handleCallContract } from './tools/contracts/evm_call_contract.js';
import { handleSendContractTransaction } from './tools/contracts/evm_send_contract_transaction.js';
import { handleGetContractABI } from './tools/contracts/evm_get_contract_abi.js';
import { handleDecodeContractData } from './tools/contracts/evm_decode_contract_data.js';
import { handleEncodeContractData } from './tools/contracts/evm_encode_contract_data.js';
import { handleDeployContract } from './tools/contracts/evm_deploy_contract.js';
import { handleEncodeFunctionData } from './tools/contracts/evm_encode_function_data.js';
import { handleDecodeFunctionResult } from './tools/contracts/evm_decode_function_result.js';
import { handleGetDexQuote } from './tools/defi/evm_get_dex_quote.js';
import { handleExecuteSwap } from './tools/defi/evm_execute_swap.js';
import { handleGetPoolInfo } from './tools/defi/evm_get_pool_info.js';
import { handleAddLiquidity } from './tools/defi/evm_add_liquidity.js';
import { handleRemoveLiquidity } from './tools/defi/evm_remove_liquidity.js';
import { handleGetUserLiquidity } from './tools/defi/evm_get_user_liquidity.js';
import { handleGetFarmingRewards } from './tools/defi/evm_get_farming_rewards.js';
import { handleClaimFarmingRewards } from './tools/defi/evm_claim_farming_rewards.js';
import { handleGenerateNftImage } from './tools/nft/evm_generate_nft_image.js';
import { handleDeployNFT } from './tools/nft/evm_deploy_nft.js';
import { handleMintNft } from './tools/nft/evm_mint_nft.js';
import { handleGetNftMetadata } from './tools/nft/evm_get_nft_metadata.js';
import { handleTransferNft } from './tools/nft/evm_transfer_nft.js';
import { handleGetNftBalance } from './tools/nft/evm_get_nft_balance.js';
import { handleApproveNft } from './tools/nft/evm_approve_nft.js';
import { handleGetNftOwner } from './tools/nft/evm_get_nft_owner.js';
import { handleGetNftApproved } from './tools/nft/evm_get_nft_approved.js';
import { handleIsApprovedForAll } from './tools/nft/evm_is_approved_for_all.js';
import { handleSetApprovalForAll } from './tools/nft/evm_set_approval_for_all.js';
import { handleGetNftInfo } from './tools/nft/evm_get_nft_info.js';
import { handleGetNftsByOwner } from './tools/nft/evm_get_nfts_by_owner.js';
import { handleCreateNftWithIpfs } from './tools/nft/evm_create_nft_with_ipfs.js';
import { handleUploadImageToIpfs } from './tools/nft/evm_upload_image_to_ipfs.js';
import { handleCreateNftMetadata } from './tools/nft/evm_create_nft_metadata.js';
import { handleGetNetworkInfo } from './tools/network/evm_get_network_info.js';
import { handleGetGasOracle } from './tools/network/evm_get_gas_oracle.js';
import { handleEstimateFees } from './tools/network/evm_estimate_fees.js';
import { handleGetBlockGasLimit } from './tools/network/evm_get_block_gas_limit.js';
import { handleGetBaseFee } from './tools/network/evm_get_base_fee.js';
import { handleGetPriorityFee } from './tools/network/evm_get_priority_fee.js';
import { handleLookupAddress } from './tools/network/evm_lookup_address.js';
import { handleHelp } from './tools/help/evm_help.js';
import { handleSearchTools } from './tools/help/evm_search_tools.js';
import { handleListToolsByCategory } from './tools/help/evm_list_tools_by_category.js';
import { handleGetAccountAnalytics } from './tools/account/evm_get_account_analytics.js';
import { handleGetPortfolioValue } from './tools/account/evm_get_portfolio_value.js';
import { handleGetTransactionAnalytics } from './tools/account/evm_get_transaction_analytics.js';
import { handleGetGasAnalytics } from './tools/account/evm_get_gas_analytics.js';
import { handleGetTokenHoldingsSummary } from './tools/account/evm_get_token_holdings_summary.js';

// Tool handlers registry - maps tool names to handler functions
export const TOOL_HANDLERS: Record<string, (args: any) => Promise<any>> = {
  evm_get_balance: handleGetBalance,
  evm_get_transaction: handleGetTransaction,
  evm_get_chain_info: handleGetChainInfo,
  evm_get_block: handleGetBlock,
  evm_validate_address: handleValidateAddress,
  evm_get_account_info: handleGetAccountInfo,
  evm_get_transaction_history: handleGetTransactionHistory,
  evm_send_transaction: handleSendTransaction,
  evm_send_native_transfer: handleSendNativeTransfer,
  evm_get_gas_price: handleGetGasPrice,
  evm_estimate_gas: handleEstimateGas,

  // JSON-RPC Wrapper Tools
  evm_get_block_number: handleGetBlockNumber,
  evm_get_chain_id: handleGetChainId,
  evm_get_code: handleGetCode,
  evm_get_storage_at: handleGetStorageAt,
  evm_get_logs: handleGetLogs,
  evm_get_transaction_count: handleGetTransactionCount,
  evm_get_transaction_receipt: handleGetTransactionReceipt,
  evm_get_fee_history: handleGetFeeHistory,
  evm_call: handleCall,

  evm_create_wallet: handleCreateWallet,
  evm_import_wallet: handleImportWallet,
  evm_generate_address: handleGenerateAddress,
  evm_get_wallet_info: handleGetWalletInfo,
  evm_sign_message: handleSignMessage,
  evm_get_token_balance: handleGetTokenBalance,
  evm_get_token_info: handleGetTokenInfo,
  evm_transfer_token: handleTransferToken,
  evm_approve_token: handleApproveToken,
  evm_get_token_allowance: handleGetTokenAllowance,
  evm_deploy_token: handleDeployToken,
  evm_mint_token: handleMintToken,
  evm_burn_token: handleBurnToken,
  evm_get_token_decimals: handleGetTokenDecimals,
  evm_get_token_name: handleGetTokenName,
  evm_get_token_symbol: handleGetTokenSymbol,
  evm_get_token_total_supply: handleGetTokenTotalSupply,
  evm_call_contract: handleCallContract,
  evm_send_contract_transaction: handleSendContractTransaction,
  evm_get_contract_abi: handleGetContractABI,
  evm_decode_contract_data: handleDecodeContractData,
  evm_encode_contract_data: handleEncodeContractData,
  evm_deploy_contract: handleDeployContract,
  evm_encode_function_data: handleEncodeFunctionData,
  evm_decode_function_result: handleDecodeFunctionResult,
  evm_get_dex_quote: handleGetDexQuote,
  evm_execute_swap: handleExecuteSwap,
  evm_get_pool_info: handleGetPoolInfo,
  evm_add_liquidity: handleAddLiquidity,
  evm_remove_liquidity: handleRemoveLiquidity,
  evm_get_user_liquidity: handleGetUserLiquidity,
  evm_get_farming_rewards: handleGetFarmingRewards,
  evm_claim_farming_rewards: handleClaimFarmingRewards,
  evm_generate_nft_image: handleGenerateNftImage,
  evm_deploy_nft: handleDeployNFT,
  evm_mint_nft: handleMintNft,
  evm_get_nft_metadata: handleGetNftMetadata,
  evm_transfer_nft: handleTransferNft,
  evm_get_nft_balance: handleGetNftBalance,
  evm_approve_nft: handleApproveNft,
  evm_get_nft_owner: handleGetNftOwner,
  evm_get_nft_approved: handleGetNftApproved,
  evm_is_approved_for_all: handleIsApprovedForAll,
  evm_set_approval_for_all: handleSetApprovalForAll,
  evm_get_nft_info: handleGetNftInfo,
  evm_get_nfts_by_owner: handleGetNftsByOwner,
  evm_create_nft_with_ipfs: handleCreateNftWithIpfs,
  evm_upload_image_to_ipfs: handleUploadImageToIpfs,
  evm_create_nft_metadata: handleCreateNftMetadata,
  evm_get_network_info: handleGetNetworkInfo,
  evm_get_gas_oracle: handleGetGasOracle,
  evm_estimate_fees: handleEstimateFees,
  evm_get_block_gas_limit: handleGetBlockGasLimit,
  evm_get_base_fee: handleGetBaseFee,
  evm_get_priority_fee: handleGetPriorityFee,
  evm_resolve_ens: handleResolveEns,
  evm_lookup_address: handleLookupAddress,
  evm_help: handleHelp,
  evm_search_tools: handleSearchTools,
  evm_list_tools_by_category: async (args) => {
    const result = await handleListToolsByCategory(args);
    return { content: [{ type: 'text', text: result }] };
  },
  evm_get_account_analytics: handleGetAccountAnalytics,
  evm_get_portfolio_value: handleGetPortfolioValue,
  evm_get_transaction_analytics: handleGetTransactionAnalytics,
  evm_get_gas_analytics: handleGetGasAnalytics,
  evm_get_token_holdings_summary: handleGetTokenHoldingsSummary,

  // New Staking Tools
  evm_stake_tokens: handleStakeTokens,
  evm_get_staking_rewards: handleGetStakingRewards,

  // New MEV Protection Tools
  evm_send_private_transaction: handleSendPrivateTransaction,

  // Flash Loan Tools - FIXED: Now validates atomicity
  // Fix: Added pre-flight estimateGas validation + transaction status check
  // Ensures callback contract repays loan or transaction fails
  evm_execute_flash_loan: handleExecuteFlashLoan,

  // New Advanced DeFi Tools
  evm_get_impermanent_loss: handleGetImpermanentLoss,

  // New Mempool Tools
  evm_get_mempool_info: handleGetMempoolInfo,

  // Bridge Tools
  evm_bridge_tokens: handleBridgeTokens,
  evm_get_bridge_status: handleGetBridgeStatus,
  evm_estimate_bridge_fee: handleEstimateBridgeFee,
  evm_find_bridge_routes: handleFindBridgeRoutes,
  evm_track_bridge_progress: handleTrackBridgeProgress,

  // Governance Tools
  evm_cast_vote: handleCastVote,

  // Event Tools
  evm_filter_logs: handleFilterLogs,

  // Lending Tools
  evm_supply_asset: handleSupplyAsset,

  // Oracle Tools
  evm_get_price_feed: handleGetPriceFeed,

  // Batch Tools
  evm_multicall: handleMulticall,

  // Yield Farming Tools
  evm_stake_lp: handleStakeLp,
  evm_unstake_lp: handleUnstakeLp,
  evm_compound_rewards: handleCompoundRewards,
  evm_get_apy: handleGetApy,

  // MEV Analysis Tools
  evm_detect_sandwich: handleDetectSandwich,
  evm_calculate_arbitrage: handleCalculateArbitrage,
  evm_simulate_bundle: handleSimulateBundle,

  // Safe Token Factory
  evm_create_token_safe: handleCreateTokenSafe,

  // Gasless Transactions
  evm_generate_permit: handleGeneratePermit,
  evm_sign_typed_data: handleSignTypedData,

  // ENS Tools
  evm_reverse_ens_lookup: handleReverseEnsLookup,

  // Token Streaming
  evm_create_token_stream: handleCreateTokenStream
};
