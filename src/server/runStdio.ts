import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ALL_GROUPS } from '../tools';
import { BaseCalmMcpServer } from './BaseCalmMcpServer';
import { buildCalmClient } from './buildClient';
import { readConfig } from './config';
import { StderrLogger } from './stderrLogger';

const PACKAGE_NAME = '@mcp-abap-adt/calm-server';
const PACKAGE_VERSION = '0.3.0';

/**
 * Entry point for standalone stdio mode. Reads `.env` + env vars,
 * builds a `CalmClient`, wires all tool groups onto a
 * `BaseCalmMcpServer`, and binds the server to the stdio transport.
 *
 * Logging goes through `StderrLogger` — never stdout — because MCP
 * stdio reserves stdout for the JSON-RPC protocol stream.
 */
export async function runStdio(): Promise<void> {
  const logger = new StderrLogger();
  const config = readConfig();
  const calm = await buildCalmClient(config, { logger });
  const server = new BaseCalmMcpServer({
    name: PACKAGE_NAME,
    version: PACKAGE_VERSION,
    calm,
    logger,
    groups: [...ALL_GROUPS],
  });

  logger.info('calm-mcp starting', {
    package: PACKAGE_NAME,
    version: PACKAGE_VERSION,
    mode: config.mode,
    baseUrl: config.baseUrl,
    tools: server.listRegisteredTools().length,
  });

  // Best-effort early token / connectivity probe so misconfiguration
  // surfaces on startup rather than on the first tool call.
  await calm.getConnection().connect();

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('calm-mcp transport bound (stdio)');

  // Graceful shutdown on SIGINT / SIGTERM — ensures stdio is cleanly
  // closed so the host does not see a dangling child process.
  const shutdown = async (): Promise<void> => {
    logger.info('calm-mcp shutdown signal received');
    try {
      await server.close();
    } finally {
      process.exit(0);
    }
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
