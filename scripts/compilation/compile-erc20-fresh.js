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

console.log('🔨 Compiling SimpleERC20.sol...\n');

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const errors = output.errors.filter(e => e.severity === 'error');
  if (errors.length > 0) {
    console.error('❌ Compilation errors:');
    errors.forEach(err => console.error(err.formattedMessage));
    process.exit(1);
  }
}

const contract = output.contracts['SimpleERC20.sol']['SimpleERC20'];
const bytecode = '0x' + contract.evm.bytecode.object;

console.log('✅ Compilation successful!\n');
console.log('📏 Bytecode length:', bytecode.length);
console.log('\n🔗 Bytecode:\n', bytecode);
console.log('\n📋 ABI:\n', JSON.stringify(contract.abi, null, 2));
console.log('\n📝 Next: Copy this bytecode to test-deploy.js');
