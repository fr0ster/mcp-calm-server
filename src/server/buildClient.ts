import { CalmClient } from '@mcp-abap-adt/calm-client';
import type { ICalmServerConfig } from './config';
import { createCalmConnection } from './connection/createCalmConnection';

/**
 * Build a ready-to-use `CalmClient` from an `ICalmServerConfig`.
 * Connection construction (auth strategy, transport, URL assembly)
 * lives in `./connection`. Consumers that need a custom connection
 * build their own `ICalmConnection` and call `new CalmClient(conn)`
 * directly, skipping this helper.
 */
export function buildCalmClient(config: ICalmServerConfig): CalmClient {
  return new CalmClient(createCalmConnection(config));
}
