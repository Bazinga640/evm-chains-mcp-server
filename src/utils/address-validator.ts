import { ethers } from 'ethers';

/**
 * Validates and checksums an Ethereum address
 * @param address - The address to validate
 * @param paramName - The parameter name (for error messages)
 * @returns Checksummed address
 * @throws Error if address is invalid
 */
export function validateAddress(address: string, paramName: string = 'address'): string {
  if (!address) {
    throw new Error(`${paramName} is required`);
  }

  if (typeof address !== 'string') {
    throw new Error(`${paramName} must be a string`);
  }

  // Check if it's a valid address format
  if (!ethers.isAddress(address)) {
    throw new Error(`Invalid ${paramName}: ${address}. Must be a valid Ethereum address (0x... format)`);
  }

  // Return checksummed version
  return ethers.getAddress(address);
}

/**
 * Validates multiple addresses
 * @param addresses - Array of addresses to validate
 * @param paramName - The parameter name (for error messages)
 * @returns Array of checksummed addresses
 * @throws Error if any address is invalid
 */
export function validateAddresses(addresses: string[], paramName: string = 'addresses'): string[] {
  if (!Array.isArray(addresses)) {
    throw new Error(`${paramName} must be an array`);
  }

  return addresses.map((addr, index) =>
    validateAddress(addr, `${paramName}[${index}]`)
  );
}

/**
 * Validates an optional address (can be undefined)
 * @param address - The address to validate (optional)
 * @param paramName - The parameter name (for error messages)
 * @returns Checksummed address or undefined
 * @throws Error if address is provided but invalid
 */
export function validateOptionalAddress(
  address: string | undefined,
  paramName: string = 'address'
): string | undefined {
  if (address === undefined || address === null || address === '') {
    return undefined;
  }

  return validateAddress(address, paramName);
}

/**
 * Convenience wrapper that validates an address and returns its checksummed form.
 * The explicit helper keeps handlers terse (`withValidatedAddress(args.tokenAddress)`).
 */
export function withValidatedAddress(address: string, paramName: string = 'address'): string {
  return validateAddress(address, paramName);
}
