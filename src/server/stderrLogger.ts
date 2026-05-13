import type { ILogger } from '@mcp-abap-adt/interfaces';

/**
 * Minimal `ILogger` that writes every level to **stderr only**.
 *
 * Why this exists: the MCP **stdio** transport reserves stdout for the
 * JSON-RPC protocol stream. Any byte written to stdout that is not a
 * valid MCP frame breaks the connection. Both the family's
 * `DefaultLogger` and `PinoLogger` write `info`/`debug` to stdout by
 * default — using them inside a stdio MCP server would corrupt the
 * stream. This logger sidesteps that by sending every message to
 * fd=2.
 *
 * Library consumers that wire `BaseCalmMcpServer` over a non-stdio
 * transport (HTTP, custom) should bring their own logger — they don't
 * have the stdout-collision concern.
 */
export class StderrLogger implements ILogger {
  private write(prefix: string, message: string, meta?: unknown): void {
    if (meta !== undefined) {
      process.stderr.write(`${prefix} ${message} ${JSON.stringify(meta)}\n`);
    } else {
      process.stderr.write(`${prefix} ${message}\n`);
    }
  }

  info(message: string, meta?: unknown): void {
    this.write('[INFO]', message, meta);
  }

  warn(message: string, meta?: unknown): void {
    this.write('[WARN]', message, meta);
  }

  error(message: string, meta?: unknown): void {
    this.write('[ERROR]', message, meta);
  }

  debug(message: string, meta?: unknown): void {
    if (process.env.CALM_LOG_LEVEL?.toLowerCase() !== 'debug') return;
    this.write('[DEBUG]', message, meta);
  }
}
