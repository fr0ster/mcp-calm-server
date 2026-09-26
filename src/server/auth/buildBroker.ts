import {
  AuthBroker,
  type TokenProviderFactory,
} from '@mcp-abap-adt/auth-broker';
import {
  AuthorizationCodeProvider,
  ClientCredentialsProvider,
} from '@mcp-abap-adt/auth-providers';
import { XsuaaSessionStore } from '@mcp-abap-adt/auth-stores';
import type { IAuthorizationStrategy } from '@mcp-abap-adt/interfaces-auth';
import type { ISessionStore } from '@mcp-abap-adt/interfaces-auth-sap';
import type { ILogger } from '@mcp-abap-adt/interfaces-utils';
import type { ICalmServerConfig } from '../config';
import { buildLegacyShimStore } from './legacyEnvShim';
import { TargetUrlSessionStore } from './targetUrlSessionStore';

/**
 * The authorization_code flow needs an interactive login this server cannot
 * conduct: it talks over stdio and nobody reads its stderr while a tool call
 * waits. Thrown by the provider's authorization strategy when the session has
 * no refresh token or the identity provider refuses the one it has; the broker
 * hands it back unchanged, so the caller can catch it by class or `code`.
 */
export class LoginRequiredError extends Error {
  readonly code = 'LOGIN_REQUIRED';

  constructor(readonly destination: string) {
    super(
      `[calm-mcp] Login required for destination "${destination}": the session holds no ` +
        `usable refresh token, and this server does not open a browser. ` +
        `Run 'npx mcp-auth --service-key ./sk.json --output ./${destination}.env --type xsuaa' ` +
        `and restart the server.`,
    );
    this.name = 'LoginRequiredError';
  }
}

/**
 * An authorization strategy that refuses every login. auth-broker 3 dropped
 * `allowBrowserAuth`; its migration note puts the refusal here instead.
 */
export function refuseLogin(
  destination: string,
): IAuthorizationStrategy<string> {
  return {
    authorize: async () => {
      throw new LoginRequiredError(destination);
    },
  };
}

interface IUaaCredentials {
  uaaUrl: string;
  clientId: string;
  clientSecret: string;
}

/**
 * Assemble an `AuthBroker` from server config.
 *
 * - Session store: the legacy `SafeXsuaaSessionStore` shim when the `.env`
 *   still inlines `CALM_UAA_*`, otherwise the file-based `XsuaaSessionStore`
 *   rooted at cwd (`./{destination}.env`, written by `mcp-auth`). Either one
 *   is wrapped in `TargetUrlSessionStore`, which answers `CALM_BASE_URL` as
 *   the session's `serviceUrl` without writing it into the session.
 * - Provider: a factory, so the broker seeds it with what the session holds —
 *   the refresh token for the authorization_code flow, and the last token.
 *   `ClientCredentialsProvider` or `AuthorizationCodeProvider` per
 *   `config.authFlow`; the latter with a strategy that refuses to log in (see
 *   `LoginRequiredError`): interactive login is the `mcp-auth` CLI's job.
 * - UAA credentials: inline config wins, else the session's. Checked here so a
 *   missing one fails at startup with the `mcp-auth` hint, not on the first
 *   tool call.
 */
export async function buildAuthBroker(
  config: ICalmServerConfig,
  logger?: ILogger,
): Promise<AuthBroker> {
  const shimStore = await buildLegacyShimStore(config);
  const ownStore: ISessionStore =
    shimStore ?? new XsuaaSessionStore(process.cwd(), config.baseUrl, logger);

  const sessionAuth = await ownStore.getAuthorizationConfig(config.destination);
  const uaaUrl = config.uaaUrl || sessionAuth?.uaaUrl;
  const clientId = config.uaaClientId || sessionAuth?.uaaClientId;
  const clientSecret = config.uaaClientSecret || sessionAuth?.uaaClientSecret;

  if (!uaaUrl || !clientId || !clientSecret) {
    throw new Error(
      `[calm-mcp] UAA credentials missing for destination "${config.destination}". ` +
        `Either inline CALM_UAA_URL/CALM_UAA_CLIENT_ID/CALM_UAA_CLIENT_SECRET in .env, ` +
        `or run 'npx mcp-auth --service-key ./sk.json --output ./${config.destination}.env --type xsuaa' first.`,
    );
  }
  const credentials: IUaaCredentials = { uaaUrl, clientId, clientSecret };

  const provider: TokenProviderFactory = (
    destination,
    authConfig,
    connConfig,
  ) =>
    config.authFlow === 'authorization_code'
      ? new AuthorizationCodeProvider({
          ...credentials,
          accessToken: connConfig.authorizationToken,
          refreshToken: authConfig?.refreshToken,
          authorization: refuseLogin(destination),
          logger,
        })
      : new ClientCredentialsProvider(credentials);

  return new AuthBroker(
    {
      sessionStore: new TargetUrlSessionStore(ownStore, config.baseUrl),
      provider,
    },
    logger,
  );
}
