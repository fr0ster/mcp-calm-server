import { CalmClient } from '@mcp-abap-adt/calm-client';
import type { ILogger } from '@mcp-abap-adt/interfaces';
import type { ICalmServerConfig } from './config';
import { createCalmConnection } from './connection/createCalmConnection';

/**
 * Build a ready-to-use `CalmClient` from an `ICalmServerConfig`.
 * Connection construction (auth strategy, transport, URL assembly)
 * lives in `./connection`. Consumers that need a custom connection
 * build their own `ICalmConnection` and call `new CalmClient(conn)`
 * directly, skipping this helper.
 *
 * `logger` is threaded into the connection for request-lifecycle
 * logging. In the stdio runtime pass the `StderrLogger` (stdout-safe).
 */
export function buildCalmClient(
  config: ICalmServerConfig,
  logger?: ILogger,
): CalmClient {
  return new CalmClient(createCalmConnection(config, { logger }));
}
