/**
 * Guidance Constants for EVM Chains MCP Server
 *
 * Extracted from index.ts to comply with MBSS v3.0 architecture requirements
 */

import os from 'os';

// Supported chains
export const SUPPORTED_CHAINS = ['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain'];

// ✅ SYSTEM CONTEXT - Computed ONCE at startup (Desktop Commander pattern)
export const SYSTEM_INFO = {
  platform: os.platform(),
  isMacOS: os.platform() === 'darwin',
  isLinux: os.platform() === 'linux',
  isWindows: os.platform() === 'win32',
  homeDir: os.homedir()
};

export const OS_GUIDANCE = SYSTEM_INFO.isMacOS ? `
Running on macOS. Default shell: zsh.

MACOS-SPECIFIC NOTES:
- Package manager: brew (Homebrew) is commonly used
- Python 3 might be 'python3' command, not 'python'
- Some GNU tools have different names (e.g., gsed instead of sed)
- Use 'open' command to open files/applications from terminal
` : SYSTEM_INFO.isLinux ? `
Running on Linux.

LINUX-SPECIFIC NOTES:
- Package manager: apt (Ubuntu/Debian), yum (RHEL/CentOS), or pacman (Arch)
- Python 3 is typically 'python3' command
- GNU tools are standard
- Use 'xdg-open' command to open files/applications
` : SYSTEM_INFO.isWindows ? `
Running on Windows.

WINDOWS-SPECIFIC NOTES:
- Package manager: chocolatey or winget
- Python might be 'python' or 'py' command
- Use PowerShell or cmd.exe
- Use 'start' command to open files/applications
- Path separators are backslashes (\\) but forward slashes (/) often work
` : 'Running on unknown platform.';

export const CHAIN_GUIDANCE = `
SUPPORTED EVM CHAINS (7 networks):
• ethereum (Sepolia) - EIP-1559 enabled, ~12s blocks, moderate gas costs
• polygon (Amoy) - Low fees, fast finality (~2s), layer 2
• avalanche (Fuji C-Chain) - Sub-second finality, dynamic fees
• bsc (BNB Testnet) - 3s blocks, low gas costs, Binance ecosystem
• arbitrum (Sepolia) - Optimistic rollup, low fees, Ethereum security
• base (Sepolia) - Coinbase layer 2, EIP-1559, low fees
• worldchain (World Sepolia) - World Network testnet, EIP-1559

CRITICAL GAS CONSIDERATIONS:
- Ethereum: High gas costs, use gas oracle for timing
- Polygon/BSC: Very low gas, safe for frequent transactions
- Arbitrum/Base: L2 optimizations, ~10-50x cheaper than Ethereum
- Avalanche: Dynamic fees, can spike during congestion
- Always check gas price before executing transactions

TESTNET TOKENS:
All chains use testnet tokens with NO REAL VALUE.
Faucets available for all supported networks.
`;
