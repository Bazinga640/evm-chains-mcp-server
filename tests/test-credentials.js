import { ethers } from 'ethers';

/**
 * Centralized test credentials loader.
 *
 * All manual/automated tests should import values from this module so we can
 * rotate wallets quickly and ensure secrets never live in the repository.
 *
 * Usage:
 *   import { privateKey, mnemonic, testWallet } from '../test-credentials.js';
 */

function requireEnv(variable) {
  const value = process.env[variable];
  if (!value || !value.trim()) {
    throw new Error(
      `Missing required environment variable ${variable}. ` +
      'Set it in your .env file (see .env.example) before running tests.'
    );
  }
  return value.trim();
}

const privateKey = requireEnv('TEST_WALLET_PRIVATE_KEY');
const mnemonic = process.env.TEST_WALLET_MNEMONIC
  ? process.env.TEST_WALLET_MNEMONIC.trim()
  : undefined;

let derivedWallet;
try {
  derivedWallet = new ethers.Wallet(privateKey);
} catch (error) {
  throw new Error(`Invalid TEST_WALLET_PRIVATE_KEY value: ${error.message}`);
}

const testWallet = {
  address: derivedWallet.address,
  privateKey
};

export { privateKey, mnemonic, testWallet };
export default { privateKey, mnemonic, testWallet };
