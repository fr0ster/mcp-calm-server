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
 * - `browser: 'none'` always — the runtime server never pops a browser;
 *   interactive AC login is the job of the `mcp-auth` CLI.
 * - `allowBrowserAuth` is flow-aware: `true` for CC (broker has a hard
 *   gate that fires when a session lacks a refresh_token, regardless of
 *   provider type — CC providers never need a browser anyway, so we let
 *   the gate pass), `false` for AC (fail fast when refresh_token is
 *   missing rather than try to launch a browser the stdio process
 *   cannot show).
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

  const allowBrowserAuth = config.authFlow !== 'authorization_code';

  return new AuthBroker(
    { sessionStore, tokenProvider, allowBrowserAuth },
    'none',
    logger,
  );
}
