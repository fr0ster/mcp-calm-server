import {
  AuthBroker,
  type TokenProviderFactory,
} from '@mcp-abap-adt/auth-broker';
import {
  AuthorizationCodeProvider,
  ClientCredentialsProvider,
} from '@mcp-abap-adt/auth-providers';
import {
  SafeXsuaaSessionStore,
  XsuaaSessionStore,
} from '@mcp-abap-adt/auth-stores';
import type { IAuthorizationStrategy } from '@mcp-abap-adt/interfaces-auth';
import type { ILogger } from '@mcp-abap-adt/interfaces-utils';
import {
  buildAuthBroker,
  LoginRequiredError,
} from '../../../../server/auth/buildBroker';
import { TargetUrlSessionStore } from '../../../../server/auth/targetUrlSessionStore';
import type { ICalmServerConfig } from '../../../../server/config';

jest.mock('@mcp-abap-adt/auth-broker');
jest.mock('@mcp-abap-adt/auth-providers');
jest.mock('@mcp-abap-adt/auth-stores');

const baseConfig: ICalmServerConfig = {
  mode: 'oauth2',
  baseUrl: 'https://t.eu10.alm.cloud.sap',
  authFlow: 'client_credentials',
  destination: 'DEFAULT',
  timeoutMs: 30_000,
  uaaUrl: 'https://uaa.example',
  uaaClientId: 'cid',
  uaaClientSecret: 'secret',
};

const noInline: ICalmServerConfig = {
  ...baseConfig,
  uaaUrl: undefined,
  uaaClientId: undefined,
  uaaClientSecret: undefined,
};

/** The broker config `buildAuthBroker` handed to the (mocked) constructor. */
function brokerArgs(): ConstructorParameters<typeof AuthBroker> | undefined {
  return jest.mocked(AuthBroker).mock.calls[0];
}

function factory(): TokenProviderFactory {
  const provider = brokerArgs()?.[0].provider;
  if (typeof provider !== 'function') {
    throw new Error('expected a provider factory');
  }
  return provider;
}

describe('buildAuthBroker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('constructs the broker with a session store and a provider factory, and no browser argument', async () => {
    const logger: ILogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
    await buildAuthBroker({ ...baseConfig }, logger);
    const args = brokerArgs();
    expect(args).toHaveLength(2);
    expect(args?.[0].sessionStore).toBeInstanceOf(TargetUrlSessionStore);
    expect(typeof args?.[0].provider).toBe('function');
    expect(args?.[0].serviceKeyStore).toBeUndefined();
    expect(args?.[1]).toBe(logger);
  });

  test('client_credentials flow builds ClientCredentialsProvider', async () => {
    await buildAuthBroker({ ...baseConfig, authFlow: 'client_credentials' });
    factory()('DEFAULT', null, { serviceUrl: baseConfig.baseUrl });
    expect(ClientCredentialsProvider).toHaveBeenCalledWith({
      uaaUrl: 'https://uaa.example',
      clientId: 'cid',
      clientSecret: 'secret',
    });
    expect(AuthorizationCodeProvider).not.toHaveBeenCalled();
  });

  test('authorization_code flow is seeded with the stored refresh token and token', async () => {
    await buildAuthBroker({ ...baseConfig, authFlow: 'authorization_code' });
    factory()(
      'DEFAULT',
      {
        uaaUrl: 'https://uaa.example',
        uaaClientId: 'cid',
        uaaClientSecret: 'secret',
        refreshToken: 'stored-refresh',
      },
      { serviceUrl: baseConfig.baseUrl, authorizationToken: 'stored-access' },
    );
    expect(AuthorizationCodeProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        uaaUrl: 'https://uaa.example',
        clientId: 'cid',
        clientSecret: 'secret',
        refreshToken: 'stored-refresh',
        accessToken: 'stored-access',
      }),
    );
    expect(ClientCredentialsProvider).not.toHaveBeenCalled();
  });

  // What auth-broker 2.x did with `allowBrowserAuth: false` — refuse a login
  // rather than wait on a callback nobody can reach — now lives in the
  // provider's authorization strategy.
  test('authorization_code refuses an interactive login with LoginRequiredError', async () => {
    await buildAuthBroker({ ...baseConfig, authFlow: 'authorization_code' });
    factory()('DEFAULT', null, { serviceUrl: baseConfig.baseUrl });
    const passed = jest.mocked(AuthorizationCodeProvider).mock.calls[0]?.[0]
      .authorization as IAuthorizationStrategy<string> | undefined;
    expect(passed).toBeDefined();
    const attempt = passed?.authorize({
      buildAuthorizationUrl: async () => 'https://uaa.example/oauth/authorize',
    });
    await expect(attempt).rejects.toBeInstanceOf(LoginRequiredError);
    await expect(attempt).rejects.toMatchObject({
      code: 'LOGIN_REQUIRED',
      message: expect.stringContaining('mcp-auth'),
    });
  });

  test('inline CALM_UAA_* uses SafeXsuaaSessionStore (legacy shim)', async () => {
    await buildAuthBroker({ ...baseConfig });
    expect(SafeXsuaaSessionStore).toHaveBeenCalledWith(
      'https://t.eu10.alm.cloud.sap',
    );
    expect(XsuaaSessionStore).not.toHaveBeenCalled();
  });

  test('no inline UAA → file-based XsuaaSessionStore on cwd, credentials from the session', async () => {
    jest
      .mocked(XsuaaSessionStore.prototype.getAuthorizationConfig)
      .mockResolvedValueOnce({
        uaaUrl: 'https://uaa.from-session',
        uaaClientId: 'cid-s',
        uaaClientSecret: 'secret-s',
      });
    await buildAuthBroker(noInline);
    expect(XsuaaSessionStore).toHaveBeenCalledWith(
      process.cwd(),
      'https://t.eu10.alm.cloud.sap',
      undefined,
    );
    expect(SafeXsuaaSessionStore).not.toHaveBeenCalled();
    factory()('DEFAULT', null, { serviceUrl: baseConfig.baseUrl });
    expect(ClientCredentialsProvider).toHaveBeenCalledWith({
      uaaUrl: 'https://uaa.from-session',
      clientId: 'cid-s',
      clientSecret: 'secret-s',
    });
  });

  test('no UAA anywhere (no inline + empty store) → throws with mcp-auth hint', async () => {
    jest
      .mocked(XsuaaSessionStore.prototype.getAuthorizationConfig)
      .mockResolvedValueOnce(null);
    await expect(buildAuthBroker(noInline)).rejects.toThrow(/mcp-auth/);
    expect(AuthBroker).not.toHaveBeenCalled();
  });
});
