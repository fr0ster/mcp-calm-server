import type {
  ICalmConnection,
  ITokenRefresher,
} from '@mcp-abap-adt/interfaces';
import type { ICalmServerConfig } from '../config';
import { OAuth2CalmConnection } from './OAuth2CalmConnection';
import { SandboxCalmConnection } from './SandboxCalmConnection';
import { XsuaaRefresher } from './XsuaaRefresher';

export interface ICreateCalmConnectionOverrides {
  /** Bring-your-own refresher; overrides the default XsuaaRefresher. */
  tokenRefresher?: ITokenRefresher;
}

export function createCalmConnection(
  config: ICalmServerConfig,
  overrides: ICreateCalmConnectionOverrides = {},
): ICalmConnection {
  if (config.mode === 'oauth2') {
    const tokenRefresher =
      overrides.tokenRefresher ??
      new XsuaaRefresher(
        config.uaaUrl as string,
        config.uaaClientId as string,
        config.uaaClientSecret as string,
      );
    return new OAuth2CalmConnection({
      baseUrl: config.baseUrl,
      tokenRefresher,
      defaultTimeout: config.timeoutMs,
    });
  }
  if (config.mode === 'sandbox') {
    return new SandboxCalmConnection({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey as string,
      defaultTimeout: config.timeoutMs,
    });
  }
  throw new Error(
    `Unsupported CALM mode: ${(config as { mode: string }).mode}`,
  );
}
