#!/usr/bin/env node

/**
 * Compile MintableNFT.sol to bytecode and ABI using solc
 * Generates contracts/MintableNFT.bytecode.json
 */

const solc = require('solc');
const fs = require('fs');
const path = require('path');

const contractsDir = path.join(__dirname, '../contracts');
const nodeModulesPath = path.join(__dirname, '../node_modules');
const contractPath = path.join(contractsDir, 'MintableNFT.sol');
const outputPath = path.join(contractsDir, 'MintableNFT.bytecode.json');

// Read contract source
const contractSource = fs.readFileSync(contractPath, 'utf8');

// Import resolver for OpenZeppelin dependencies
function findImports(importPath) {
  try {
    const fullPath = path.join(nodeModulesPath, importPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    return { contents: content };
  } catch (error) {
    console.error(`Error importing ${importPath}:`, error.message);
    return { error: 'File not found' };
  }
}

// Solc input structure
const input = {
  language: 'Solidity',
  sources: {
    'MintableNFT.sol': {
      content: contractSource
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

console.log('🔨 Compiling MintableNFT.sol with OpenZeppelin dependencies...\n');

// Compile
const output = JSON.parse(
  solc.compile(JSON.stringify(input), { import: findImports })
);

// Check for errors
if (output.errors) {
  const errors = output.errors.filter(e => e.severity === 'error');
  if (errors.length > 0) {
    console.error('❌ Compilation errors:');
    errors.forEach(err => console.error(err.formattedMessage));
    process.exit(1);
  }

  // Show warnings
  const warnings = output.errors.filter(e => e.severity === 'warning');
  if (warnings.length > 0) {
    console.warn('⚠️  Compilation warnings:');
    warnings.forEach(warn => console.warn(warn.formattedMessage));
  }
}

// Extract compiled contract
const contract = output.contracts['MintableNFT.sol']['MintableNFT'];

if (!contract) {
  console.error('❌ Contract not found in compilation output');
  process.exit(1);
}

// Prepare output
const bytecodeJson = {
  abi: contract.abi,
  bytecode: contract.evm.bytecode.object,
  compiler: {
    version: '0.8.20',
    optimizer: true,
    runs: 200
  },
  contract: {
    name: 'MintableNFT',
    type: 'ERC721',
    features: ['ERC721URIStorage', 'Ownable', 'Owner-controlled minting'],
    standard: 'OpenZeppelin v5.1.0'
  }
};

// Write to file
fs.writeFileSync(outputPath, JSON.stringify(bytecodeJson, null, 2));

console.log('✅ Compilation successful!\n');
console.log('📄 Contract: MintableNFT');
console.log('📦 Output:', outputPath);
console.log('🔧 ABI entries:', contract.abi.length);
console.log('📏 Bytecode size:', contract.evm.bytecode.object.length / 2, 'bytes');
console.log('\n🎯 Features:');
console.log('   - ERC721 standard with URI storage');
console.log('   - Owner can mint with custom tokenURI');
console.log('   - SafeMint with receiver check');
console.log('   - Based on OpenZeppelin v5.1.0\n');
