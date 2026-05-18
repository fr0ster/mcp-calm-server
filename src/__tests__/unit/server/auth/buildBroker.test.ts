import { AuthBroker } from '@mcp-abap-adt/auth-broker';
import {
  AuthorizationCodeProvider,
  ClientCredentialsProvider,
} from '@mcp-abap-adt/auth-providers';
import {
  SafeXsuaaSessionStore,
  XsuaaSessionStore,
} from '@mcp-abap-adt/auth-stores';
import { buildAuthBroker } from '../../../../server/auth/buildBroker';
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

describe('buildAuthBroker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('client_credentials flow uses ClientCredentialsProvider', async () => {
    await buildAuthBroker({ ...baseConfig, authFlow: 'client_credentials' });
    expect(ClientCredentialsProvider).toHaveBeenCalledWith({
      uaaUrl: 'https://uaa.example',
      clientId: 'cid',
      clientSecret: 'secret',
    });
    expect(AuthorizationCodeProvider).not.toHaveBeenCalled();
  });

  test('authorization_code flow uses AuthorizationCodeProvider', async () => {
    await buildAuthBroker({ ...baseConfig, authFlow: 'authorization_code' });
    expect(AuthorizationCodeProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        uaaUrl: 'https://uaa.example',
        clientId: 'cid',
        clientSecret: 'secret',
        browser: 'none',
      }),
    );
    expect(ClientCredentialsProvider).not.toHaveBeenCalled();
  });

  test('inline CALM_UAA_* uses SafeXsuaaSessionStore (legacy shim)', async () => {
    await buildAuthBroker({ ...baseConfig });
    expect(SafeXsuaaSessionStore).toHaveBeenCalledWith(
      'https://t.eu10.alm.cloud.sap',
    );
    expect(XsuaaSessionStore).not.toHaveBeenCalled();
  });

  test('no inline UAA → file-based XsuaaSessionStore on cwd', async () => {
    // Simulate DEFAULT.env having UAA creds — broker reads them from store.
    (XsuaaSessionStore as jest.Mock).mockImplementation(() => ({
      getAuthorizationConfig: jest.fn().mockResolvedValue({
        uaaUrl: 'https://uaa.example',
        uaaClientId: 'cid',
        uaaClientSecret: 'secret',
      }),
    }));
    const noInline = {
      ...baseConfig,
      uaaUrl: undefined,
      uaaClientId: undefined,
      uaaClientSecret: undefined,
    };
    await buildAuthBroker(noInline);
    expect(XsuaaSessionStore).toHaveBeenCalledWith(
      process.cwd(),
      'https://t.eu10.alm.cloud.sap',
      undefined,
    );
    expect(SafeXsuaaSessionStore).not.toHaveBeenCalled();
  });

  test('no UAA anywhere (no inline + empty store) → throws with mcp-auth hint', async () => {
    (XsuaaSessionStore as jest.Mock).mockImplementation(() => ({
      getAuthorizationConfig: jest.fn().mockResolvedValue(null),
    }));
    const noInline = {
      ...baseConfig,
      uaaUrl: undefined,
      uaaClientId: undefined,
      uaaClientSecret: undefined,
    };
    await expect(buildAuthBroker(noInline)).rejects.toThrow(/mcp-auth/);
  });

  test('CC flow: allowBrowserAuth=true (broker has hard-gate on no refresh_token)', async () => {
    await buildAuthBroker({ ...baseConfig, authFlow: 'client_credentials' });
    expect(AuthBroker).toHaveBeenCalledWith(
      expect.objectContaining({ allowBrowserAuth: true }),
      'none',
      undefined,
    );
  });

  test('AC flow: allowBrowserAuth=false (fail fast on missing refresh_token)', async () => {
    await buildAuthBroker({ ...baseConfig, authFlow: 'authorization_code' });
    expect(AuthBroker).toHaveBeenCalledWith(
      expect.objectContaining({ allowBrowserAuth: false }),
      'none',
      undefined,
    );
  });

  test('passes logger through to AuthBroker constructor', async () => {
    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
    await buildAuthBroker({ ...baseConfig }, logger as any);
    expect(AuthBroker).toHaveBeenCalledWith(expect.anything(), 'none', logger);
  });
});
