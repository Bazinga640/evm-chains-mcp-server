#!/usr/bin/env node
/**
 * Extract TOOLS array from index.ts to tool-definitions.ts
 */
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'src/index.ts');
const toolDefsPath = path.join(__dirname, 'src/tool-definitions.ts');

console.log('Reading index.ts...');
const content = fs.readFileSync(indexPath, 'utf8');
const lines = content.split('\n');

// Find start and end of TOOLS array
const toolsStart = lines.findIndex(line => line.match(/^const TOOLS = \[/));
const toolsEnd = lines.findIndex((line, idx) => idx > toolsStart && line.match(/^\];$/));

console.log(`Found TOOLS array: lines ${toolsStart + 1} to ${toolsEnd + 1}`);
console.log(`Extracting ${toolsEnd - toolsStart + 1} lines...`);

// Extract the TOOLS array
const toolsArray = lines.slice(toolsStart, toolsEnd + 1);

// Create tool-definitions.ts content
const toolDefsContent = `/**
 * Tool Definitions for EVM Chains MCP Server
 *
 * This file contains all 105 tool definitions extracted from index.ts
 * to comply with MBSS v3.0 architecture requirements (<300 lines in index.ts)
 */

${toolsArray.join('\n')}

export { TOOLS };
`;

// Write tool-definitions.ts
console.log('Writing tool-definitions.ts...');
fs.writeFileSync(toolDefsPath, toolDefsContent);

// Create new index.ts with import instead of inline array
const beforeTools = lines.slice(0, toolsStart);
const afterTools = lines.slice(toolsEnd + 1);

// Add import statement after other imports (find last import line)
const lastImportIdx = beforeTools.findLastIndex(line => line.match(/^import /));

const newIndexLines = [
  ...beforeTools.slice(0, lastImportIdx + 1),
  "import { TOOLS } from './tool-definitions.js';",
  ...beforeTools.slice(lastImportIdx + 1),
  ...afterTools
];

const newIndexContent = newIndexLines.join('\n');

console.log('Writing new index.ts...');
fs.writeFileSync(indexPath, newIndexContent);

// Calculate stats
const oldSize = lines.length;
const newSize = newIndexLines.length;
const toolDefsSize = toolDefsContent.split('\n').length;

console.log('\n✅ Extraction complete!');
console.log(`\nOld index.ts: ${oldSize} lines`);
console.log(`New index.ts: ${newSize} lines (${oldSize - newSize} lines removed)`);
console.log(`tool-definitions.ts: ${toolDefsSize} lines`);
console.log(`\nMBSS v3.0 requirement: <300 lines in index.ts`);
console.log(`Status: ${newSize < 300 ? '✅ COMPLIANT' : '❌ Still too large'}`);
