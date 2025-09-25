import { ethers } from 'ethers';

const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL;
const ENS_NAME = process.env.MAINNET_ENS_NAME || 'vitalik.eth';
const ENS_FALLBACK_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

const describeOrSkip = MAINNET_RPC_URL ? describe : describe.skip;

describeOrSkip('JSON-RPC wrapper smoke tests (mainnet)', () => {
  const provider = new ethers.JsonRpcProvider(MAINNET_RPC_URL);

  it('gets basic network data', async () => {
    const network = await provider.getNetwork();
    expect(Number(network.chainId)).toBeGreaterThan(0);

    const blockNumber = await provider.getBlockNumber();
    expect(blockNumber).toBeGreaterThan(0);

    const feeData = await provider.getFeeData();
    expect(feeData).toHaveProperty('gasPrice');
  }, 30_000);

  it('performs contract read operations', async () => {
    const erc20 = new ethers.Contract(
      USDC_ADDRESS,
      ['function balanceOf(address) view returns (uint256)'],
      provider
    );
    const balance = await erc20.balanceOf(ENS_FALLBACK_ADDRESS);
    expect(balance).toBeInstanceOf(BigInt);
  }, 30_000);

  it('resolves ENS names', async () => {
    const resolved = await provider.resolveName(ENS_NAME);
    expect(resolved).toMatch(/^0x[a-fA-F0-9]{40}$/);

    const reverse = await provider.lookupAddress(resolved!);
    expect(typeof reverse === 'string' || reverse === null).toBe(true);
  }, 30_000);
});
