import type { ITokenRefresher } from '@mcp-abap-adt/interfaces';

/**
 * Minimal XSUAA `client_credentials` refresher — sufficient for
 * standalone-mode servers without a shared auth-broker. Caches the
 * token until `refreshToken()` is called. Consumers running
 * `@mcp-abap-adt/auth-broker` can pass their own ITokenRefresher to
 * the connection factory instead.
 */
export class XsuaaRefresher implements ITokenRefresher {
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
