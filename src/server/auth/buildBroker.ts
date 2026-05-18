import { AuthBroker } from '@mcp-abap-adt/auth-broker';
import {
  AuthorizationCodeProvider,
  ClientCredentialsProvider,
} from '@mcp-abap-adt/auth-providers';
import { XsuaaSessionStore } from '@mcp-abap-adt/auth-stores';
import type {
  ILogger,
  ISessionStore,
  ITokenProvider,
} from '@mcp-abap-adt/interfaces';
import type { ICalmServerConfig } from '../config';
import { buildLegacyShimStore } from './legacyEnvShim';

/**
 * Assemble an `AuthBroker` from server config.
 *
 * - Chooses `ClientCredentialsProvider` or `AuthorizationCodeProvider`
 *   based on `config.authFlow`.
 * - Chooses session store: legacy `SafeXsuaaSessionStore` shim when the
 *   `.env` still inlines `CALM_UAA_*`, otherwise file-based
 *   `XsuaaSessionStore` rooted at cwd (loads `./{destination}.env`).
 * - Always `allowBrowserAuth: false` — interactive login is the job
 *   of the `mcp-auth` CLI, not the runtime server.
 * - `browser: 'none'` is the broker-level default for headless runs.
 */
export async function buildAuthBroker(
  config: ICalmServerConfig,
  logger?: ILogger,
): Promise<AuthBroker> {
  const shimStore = await buildLegacyShimStore(config);
  const sessionStore: ISessionStore =
    shimStore ?? new XsuaaSessionStore(process.cwd(), config.baseUrl, logger);

  const tokenProvider: ITokenProvider =
    config.authFlow === 'authorization_code'
      ? new AuthorizationCodeProvider({
          uaaUrl: config.uaaUrl ?? '',
          clientId: config.uaaClientId ?? '',
          clientSecret: config.uaaClientSecret ?? '',
          browser: 'none',
          logger,
        })
      : new ClientCredentialsProvider({
          uaaUrl: config.uaaUrl ?? '',
          clientId: config.uaaClientId ?? '',
          clientSecret: config.uaaClientSecret ?? '',
        });

  return new AuthBroker(
    { sessionStore, tokenProvider, allowBrowserAuth: false },
    'none',
    logger,
  );
}
