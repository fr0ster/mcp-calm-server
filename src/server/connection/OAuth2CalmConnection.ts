import type { ITokenRefresher } from '@mcp-abap-adt/interfaces';
import {
  AbstractCalmConnection,
  type IAbstractCalmConnectionOptions,
} from './AbstractCalmConnection';

export interface IOAuth2CalmConnectionOptions
  extends IAbstractCalmConnectionOptions {
  tokenRefresher: ITokenRefresher;
}

export class OAuth2CalmConnection extends AbstractCalmConnection {
  private readonly tokenRefresher: ITokenRefresher;
  constructor(options: IOAuth2CalmConnectionOptions) {
    super(options);
    this.tokenRefresher = options.tokenRefresher;
  }

  async connect(): Promise<void> {
    await this.tokenRefresher.getToken();
  }

  protected async attachAuth(): Promise<Record<string, string>> {
    const token = await this.tokenRefresher.getToken();
    return { Authorization: `Bearer ${token}` };
  }

  protected async onAuthFailure(status: number): Promise<boolean> {
    if (status === 401 || status === 403) {
      await this.tokenRefresher.refreshToken();
      return true;
    }
    return false;
  }
}
