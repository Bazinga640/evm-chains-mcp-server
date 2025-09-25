import solc from 'solc';
import fs from 'fs';

const source = fs.readFileSync('MinimalStorage.sol', 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'MinimalStorage.sol': {
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

const contract = output.contracts['MinimalStorage.sol']['MinimalStorage'];
console.log('Bytecode:', '0x' + contract.evm.bytecode.object);
console.log('\nABI:', JSON.stringify(contract.abi, null, 2));
