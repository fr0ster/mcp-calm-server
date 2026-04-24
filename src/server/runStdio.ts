import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ALL_GROUPS } from '../tools';
import { BaseCalmMcpServer } from './BaseCalmMcpServer';
import { buildCalmClient } from './buildClient';
import { readConfig } from './config';

const PACKAGE_NAME = '@mcp-abap-adt/calm-server';
const PACKAGE_VERSION = '0.0.1';

/**
 * Entry point for standalone stdio mode. Reads `.env` + env vars,
 * builds a `CalmClient`, wires all tool groups onto a
 * `BaseCalmMcpServer`, and binds the server to the stdio transport.
 *
 * Errors during config/connect phase are written to stderr so the
 * host (Claude Desktop / whoever) sees a meaningful failure instead
 * of a silent hang. On success, stdio takes over — no console output
 * from the server.
 */
export async function runStdio(): Promise<void> {
  const config = readConfig();
  const calm = buildCalmClient(config);
  const server = new BaseCalmMcpServer({
    name: PACKAGE_NAME,
    version: PACKAGE_VERSION,
    calm,
    groups: [...ALL_GROUPS],
  });

  // Best-effort early token / connectivity probe so misconfiguration
  // surfaces on startup rather than on the first tool call.
  await calm.getConnection().connect();

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Graceful shutdown on SIGINT / SIGTERM — ensures stdio is cleanly
  // closed so the host does not see a dangling child process.
  const shutdown = async (): Promise<void> => {
    try {
      await server.close();
    } finally {
      process.exit(0);
    }
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
