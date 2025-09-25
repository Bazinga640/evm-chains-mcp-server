/**
 * Get working ERC20 bytecode using solc-js
 */

import solc from 'solc';
import fs from 'fs';

const source = fs.readFileSync('SimpleERC20.sol', 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'SimpleERC20.sol': {
      content: source
    }
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode']
      }
    },
    optimizer: {
      enabled: true,
      runs: 200
    }
  }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  output.errors.forEach(err => console.error(err.formattedMessage));
}

const contract = output.contracts['SimpleERC20.sol']['SimpleERC20'];
console.log('Bytecode:', contract.evm.bytecode.object);
console.log('\nABI:', JSON.stringify(contract.abi, null, 2));
