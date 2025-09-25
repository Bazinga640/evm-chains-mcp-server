import { ethers } from 'ethers';

export function getWebSocketProviderFromEnv(envKey: string): ethers.WebSocketProvider | null {
  const url = process.env[envKey];
  if (!url) {
    return null;
  }

  try {
    return new ethers.WebSocketProvider(url);
  } catch {
    return null;
  }
}
