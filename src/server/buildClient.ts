import { CalmClient, CalmConnection } from '@mcp-abap-adt/calm-client';
import type { ILogger } from '@mcp-abap-adt/interfaces';
import { buildAuthBroker } from './auth/buildBroker';
import type { ICalmServerConfig } from './config';

export interface BuildCalmClientOptions {
  logger?: ILogger;
}

/**
 * Build a ready-to-use `CalmClient` from a `ICalmServerConfig`.
 *
 * - `oauth2` mode: delegates token acquisition to `@mcp-abap-adt/auth-broker`.
 *   Pass `options.logger` (e.g. `StderrLogger` from `src/server/stderrLogger.ts`)
 *   when running in stdio mode so broker logs do NOT collide with the
 *   MCP JSON-RPC frames on stdout.
 * - `sandbox` mode: direct API-key auth, no broker involved.
 */
export async function buildCalmClient(
  config: ICalmServerConfig,
  options: BuildCalmClientOptions = {},
): Promise<CalmClient> {
  if (config.mode === 'oauth2') {
    const broker = await buildAuthBroker(config, options.logger);
    const refresher = broker.createTokenRefresher(config.destination);
    const connection = new CalmConnection({
      baseUrl: config.baseUrl,
      tokenRefresher: refresher,
      defaultTimeout: config.timeoutMs,
    });
    return new CalmClient(connection);
  }
  const connection = new CalmConnection({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey as string,
    defaultTimeout: config.timeoutMs,
  });
  return new CalmClient(connection);
}
