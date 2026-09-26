import type {
  IAuthorizationConfig,
  IConfig,
  IConnectionConfig,
  ISessionStore,
} from '@mcp-abap-adt/interfaces-auth-sap';

/**
 * A session store that tells the broker `CALM_BASE_URL` without writing it
 * into the destination's session.
 *
 * auth-broker 3 refuses a destination whose session holds no `serviceUrl`
 * (this server passes no service-key store), and the `{destination}.env` that
 * `mcp-auth` writes for a Cloud ALM service key usually has none: `mcp-auth`
 * drops its placeholder URL, and the URL Cloud ALM is reached at is
 * `CALM_BASE_URL`, which this server is configured with. The broker also
 * writes the `serviceUrl` it resolved back on every token it stores, so
 * handing it the base URL through the file would put it into the user's
 * session.
 *
 * Reads answer the base URL as the `serviceUrl`. Writes carry the URL the
 * session already holds — or none, leaving the store to keep what it has and
 * to create a new session its own way. Everything else passes through.
 *
 * The same approach as `TargetUrlSessionStore` in `mcp-abap-adt-proxy`, with
 * one difference: a session without a URL is not given one on write.
 */
export class TargetUrlSessionStore implements ISessionStore {
  constructor(
    private readonly inner: ISessionStore,
    private readonly targetUrl: string,
  ) {}

  async loadSession(destination: string): Promise<IConfig | null> {
    const session = await this.inner.loadSession(destination);
    return session ? { ...session, serviceUrl: this.targetUrl } : null;
  }

  async getConnectionConfig(
    destination: string,
  ): Promise<IConnectionConfig | null> {
    const connection = await this.inner.getConnectionConfig(destination);
    return { ...(connection ?? {}), serviceUrl: this.targetUrl };
  }

  getAuthorizationConfig(
    destination: string,
  ): Promise<IAuthorizationConfig | null> {
    return this.inner.getAuthorizationConfig(destination);
  }

  setAuthorizationConfig(
    destination: string,
    config: IAuthorizationConfig,
  ): Promise<void> {
    return this.inner.setAuthorizationConfig(destination, config);
  }

  async setConnectionConfig(
    destination: string,
    config: IConnectionConfig,
  ): Promise<void> {
    await this.inner.setConnectionConfig(destination, {
      ...config,
      serviceUrl: await this.ownServiceUrl(destination),
    });
  }

  async saveSession(destination: string, config: unknown): Promise<void> {
    // `ISessionStore.saveSession` takes `IConfig | unknown`: anything that is
    // not an object is passed on untouched rather than asserted into shape.
    if (typeof config !== 'object' || config === null) {
      await this.inner.saveSession(destination, config);
      return;
    }
    await this.inner.saveSession(destination, {
      ...config,
      serviceUrl: await this.ownServiceUrl(destination),
    });
  }

  async deleteSession(destination: string): Promise<void> {
    await this.inner.deleteSession?.(destination);
  }

  /** The URL the session itself holds, or `undefined` when it holds none. */
  private async ownServiceUrl(
    destination: string,
  ): Promise<string | undefined> {
    const stored = await this.inner.getConnectionConfig(destination);
    return stored?.serviceUrl;
  }
}
