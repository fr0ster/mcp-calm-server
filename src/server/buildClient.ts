import { CalmClient } from '@mcp-abap-adt/calm-client';
import type { ILogger } from '@mcp-abap-adt/interfaces';
import { buildAuthBroker } from './auth/buildBroker';
import type { ICalmServerConfig } from './config';
import { createCalmConnection } from './connection/createCalmConnection';

export interface BuildCalmClientOptions {
  logger?: ILogger;
}

/**
 * Build a ready-to-use `CalmClient` from a `ICalmServerConfig`.
 *
 * Connection construction (fetch transport, verbatim base URL, request
 * logging) lives in `./connection`. Token acquisition is delegated:
 *
 * - `oauth2` mode: `@mcp-abap-adt/auth-broker` produces the
 *   `ITokenRefresher` (honouring `CALM_AUTH_FLOW` + session stores);
 *   it is injected into the connection via the factory's
 *   `tokenRefresher` override. Pass `options.logger` (e.g.
 *   `StderrLogger`) in stdio mode so broker + connection logs go to
 *   stderr, never the MCP stdout frame stream.
 * - `sandbox` mode: direct API-key auth, no broker involved.
 */
export async function buildCalmClient(
  config: ICalmServerConfig,
  options: BuildCalmClientOptions = {},
): Promise<CalmClient> {
  if (config.mode === 'oauth2') {
    const broker = await buildAuthBroker(config, options.logger);
    const tokenRefresher = broker.createTokenRefresher(config.destination);
    return new CalmClient(
      createCalmConnection(config, {
        tokenRefresher,
        logger: options.logger,
      }),
    );
  }
  return new CalmClient(
    createCalmConnection(config, { logger: options.logger }),
  );
}
