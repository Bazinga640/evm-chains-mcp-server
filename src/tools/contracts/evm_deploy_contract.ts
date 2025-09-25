/**
 * EVM Deploy Contract Tool
 *
 * Deploy a smart contract from bytecode with constructor arguments
 */

import { z } from 'zod';
import { ethers } from 'ethers';
import { getClientManager } from '../../client-manager.js';

const inputSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'base', 'worldchain']),
  bytecode: z.string().describe('Contract bytecode (0x-prefixed hex)'),
  abi: z.array(z.any()).describe('Contract ABI for constructor'),
  constructorArgs: z.array(z.any()).optional().describe('Constructor arguments (if any)'),
  privateKey: z.string().describe('Deployer private key')
});

export async function handleDeployContract(args: z.infer<typeof inputSchema>) {
  const startTime = Date.now();
  const validated = inputSchema.parse(args);

  try {
    const clientManager = getClientManager();
    const provider = clientManager.getProvider(validated.chain);
    const wallet = new ethers.Wallet(validated.privateKey, provider);

    // Create contract factory
    const factory = new ethers.ContractFactory(
      validated.abi,
      validated.bytecode,
      wallet
    );

    // Deploy contract
    const contract = await factory.deploy(...(validated.constructorArgs || []));
    await contract.waitForDeployment();

    const deployedAddress = await contract.getAddress();
    const deployTx = contract.deploymentTransaction();

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chain: validated.chain,
          contractAddress: deployedAddress,
          transactionHash: deployTx?.hash,
          deployer: wallet.address,
          executionTime: `${Date.now() - startTime}ms`
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error.message,
          chain: validated.chain,
          executionTime: `${Date.now() - startTime}ms`
        }, null, 2)
      }]
    };
  }
}
