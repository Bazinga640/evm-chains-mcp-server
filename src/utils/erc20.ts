import { ethers } from 'ethers';
import { validateAddress } from './address-validator.js';

export const STANDARD_ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

export function getErc20Contract(
  address: string,
  signerOrProvider: ethers.Signer | ethers.Provider,
  extraFragments: string[] = []
): ethers.Contract {
  const checksum = validateAddress(address, 'tokenAddress');
  const abi = [...STANDARD_ERC20_ABI, ...extraFragments];
  return new ethers.Contract(checksum, abi, signerOrProvider);
}
