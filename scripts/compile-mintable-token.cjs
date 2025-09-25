/**
 * Compile MintableBurnableERC20 contract using solc
 * Generates bytecode and ABI for deployment
 */

const solc = require('solc');
const fs = require('fs');
const path = require('path');

// Read the contract source
const contractPath = path.join(__dirname, '../contracts/MintableBurnableERC20.sol');
const contractSource = fs.readFileSync(contractPath, 'utf8');

// Read OpenZeppelin dependencies
const nodeModulesPath = path.join(__dirname, '../node_modules');

function findImports(importPath) {
  try {
    const fullPath = path.join(nodeModulesPath, importPath);
    const contents = fs.readFileSync(fullPath, 'utf8');
    return { contents };
  } catch (error) {
    return { error: `File not found: ${importPath}` };
  }
}

// Compile configuration
const input = {
  language: 'Solidity',
  sources: {
    'MintableBurnableERC20.sol': {
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

console.log('Compiling MintableBurnableERC20...');

// Compile the contract
const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

// Check for errors
if (output.errors) {
  output.errors.forEach(error => {
    if (error.severity === 'error') {
      console.error('❌ Compilation Error:', error.formattedMessage);
      process.exit(1);
    } else {
      console.warn('⚠️  Warning:', error.formattedMessage);
    }
  });
}

// Extract compiled contract
const contract = output.contracts['MintableBurnableERC20.sol']['MintableBurnableERC20'];

if (!contract) {
  console.error('❌ Contract not found in compilation output');
  process.exit(1);
}

// Prepare output
const artifactOutput = {
  contractName: 'MintableBurnableERC20',
  abi: contract.abi,
  bytecode: '0x' + contract.evm.bytecode.object,
  compiler: {
    version: '0.8.20+commit.a1b79de6',
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  dependencies: {
    '@openzeppelin/contracts': '^5.1.0'
  },
  features: [
    'ERC20',
    'Mintable (owner only)',
    'Burnable (anyone)',
    'Ownable',
    'Dynamic name/symbol'
  ],
  compiledAt: new Date().toISOString()
};

// Write bytecode artifact
const outputPath = path.join(__dirname, '../contracts/MintableBurnableERC20.bytecode.json');
fs.writeFileSync(outputPath, JSON.stringify(artifactOutput, null, 2));

console.log('✅ Compilation successful!');
console.log(`📄 Artifact saved to: contracts/MintableBurnableERC20.bytecode.json`);
console.log(`📏 Bytecode size: ${contract.evm.bytecode.object.length / 2} bytes`);
console.log(`🔧 Functions: ${contract.abi.filter(item => item.type === 'function').length}`);
console.log(`📡 Events: ${contract.abi.filter(item => item.type === 'event').length}`);
console.log('\n✨ Ready for deployment via evm_deploy_token (mintable: true)');
