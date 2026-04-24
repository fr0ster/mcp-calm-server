import { CalmClient, CalmConnection } from '@mcp-abap-adt/calm-client';
import type { ITokenRefresher } from '@mcp-abap-adt/interfaces';
import type { ICalmServerConfig } from './config';

/**
 * Minimal XSUAA `client_credentials` refresher — sufficient for
 * standalone-mode servers where no shared auth-broker/session store is
 * configured. Caches the token until explicitly refreshed. Production
 * consumers that already run `@mcp-abap-adt/auth-broker` elsewhere
 * should pass their own `ITokenRefresher` via `buildCalmClient.override`.
 */
class XsuaaRefresher implements ITokenRefresher {
  private cached?: string;

  constructor(
    private readonly uaaUrl: string,
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  async getToken(): Promise<string> {
    if (!this.cached) return this.refreshToken();
    return this.cached;
  }

  async refreshToken(): Promise<string> {
    const url = `${this.uaaUrl.replace(/\/$/, '')}/oauth/token`;
    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      'base64',
    );
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `XSUAA token request failed: ${response.status} ${response.statusText} — ${body.slice(0, 200)}`,
      );
    }
    const json = (await response.json()) as { access_token?: string };
    if (!json.access_token) {
      throw new Error('XSUAA token response missing access_token');
    }
    this.cached = json.access_token;
    return this.cached;
  }
}

/**
 * Build a ready-to-use `CalmClient` from a `ICalmServerConfig`. Picks
 * OAuth2 or sandbox mode based on config.mode. The returned connection
 * is stateless from the server's perspective — constructing a fresh
 * CalmClient per process is cheap.
 */
export function buildCalmClient(config: ICalmServerConfig): CalmClient {
  if (config.mode === 'oauth2') {
    const refresher = new XsuaaRefresher(
      config.uaaUrl as string,
      config.uaaClientId as string,
      config.uaaClientSecret as string,
    );
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
