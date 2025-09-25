import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Simple file-based logger for MCP server
 *
 * MCP servers MUST NOT use console.log/console.error as they violate the stdio protocol.
 * This logger writes to a file when DEBUG mode is enabled, otherwise stays silent.
 *
 * Enable logging with environment variables:
 * - DEBUG=true
 * - EVM_MCP_DEBUG=true
 *
 * Configure log file location:
 * - EVM_MCP_LOG_FILE=/path/to/log/file
 * - Defaults to: /tmp/evm-mcp-server.log (Unix) or %TEMP%\evm-mcp-server.log (Windows)
 */

const DEBUG_ENABLED = process.env.DEBUG === 'true' || process.env.EVM_MCP_DEBUG === 'true';
const LOG_FILE = process.env.EVM_MCP_LOG_FILE || path.join(os.tmpdir(), 'evm-mcp-server.log');

/**
 * Write debug log message to file (if DEBUG mode enabled)
 *
 * @param args - Arguments to log (will be joined with spaces)
 */
export function debugLog(...args: any[]): void {
  if (!DEBUG_ENABLED) {
    return; // Silent operation by default
  }

  const timestamp = new Date().toISOString();
  const message = args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');

  const logLine = `[${timestamp}] ${message}\n`;

  try {
    fs.appendFileSync(LOG_FILE, logLine);
  } catch (error) {
    // Silent failure - don't break server if logging fails
    // This prevents logging errors from affecting MCP protocol communication
  }
}

/**
 * Log error with stack trace (if DEBUG mode enabled)
 *
 * @param message - Error message
 * @param error - Error object
 */
export function debugError(message: string, error: any): void {
  if (!DEBUG_ENABLED) {
    return;
  }

  const timestamp = new Date().toISOString();
  const errorDetails = error instanceof Error
    ? `${error.message}\n${error.stack}`
    : String(error);

  const logLine = `[${timestamp}] ERROR: ${message}\n${errorDetails}\n`;

  try {
    fs.appendFileSync(LOG_FILE, logLine);
  } catch {
    // Silent failure
  }
}
