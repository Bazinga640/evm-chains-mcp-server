#!/usr/bin/env node

/**
 * Compile DynamicERC20.sol and generate bytecode for evm_deploy_token
 */

const solc = require('solc');
const fs = require('fs');
const path = require('path');

const contractPath = path.join(__dirname, '../contracts/DynamicERC20.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'DynamicERC20.sol': {
      content: source
    }
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode']
      }
    }
  }
};

console.log('Compiling DynamicERC20.sol with solc 0.8.30...\n');

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const errors = output.errors.filter(e => e.severity === 'error');
  const warnings = output.errors.filter(e => e.severity === 'warning');

  if (warnings.length > 0) {
    console.log('⚠️  Warnings:');
    warnings.forEach(w => console.log(`  ${w.formattedMessage}`));
    console.log('');
  }

  if (errors.length > 0) {
    console.error('❌ Compilation errors:');
    errors.forEach(e => console.error(`  ${e.formattedMessage}`));
    process.exit(1);
  }
}

const contract = output.contracts['DynamicERC20.sol']['DynamicERC20'];
const bytecode = contract.evm.bytecode.object;
const abi = contract.abi;

console.log('✅ Compilation successful!\n');
console.log('Contract: DynamicERC20');
console.log('Compiler: solc 0.8.30');
console.log('Optimizer: enabled (200 runs)');
console.log(`Bytecode size: ${bytecode.length / 2} bytes\n`);

// Write bytecode to file
const bytecodeOutput = {
  contractName: 'DynamicERC20',
  compiler: 'solc 0.8.30',
  optimizer: {
    enabled: true,
    runs: 200
  },
  bytecode: '0x' + bytecode,
  abi: abi,
  constructor: {
    parameters: [
      { name: 'tokenName', type: 'string' },
      { name: 'tokenSymbol', type: 'string' },
      { name: 'initialSupply', type: 'uint256' }
    ]
  },
  features: [
    'ERC20 standard compliant',
    'Customizable name and symbol',
    'Fixed 18 decimals',
    'Address(0) guards on transfer/approve',
    'Gas optimized with Solidity 0.8.20'
  ]
};

const outputPath = path.join(__dirname, '../contracts/DynamicERC20.bytecode.json');
fs.writeFileSync(outputPath, JSON.stringify(bytecodeOutput, null, 2));

console.log(`📝 Bytecode written to: ${outputPath}\n`);
console.log('Constructor ABI:');
const constructor = abi.find(item => item.type === 'constructor');
console.log(JSON.stringify(constructor, null, 2));
console.log('\n✅ Ready to use in evm_deploy_token handler!');
