import { CalmConnection } from '@mcp-abap-adt/calm-client';
import { buildAuthBroker } from '../../../server/auth/buildBroker';
import { buildCalmClient } from '../../../server/buildClient';
import type { ICalmServerConfig } from '../../../server/config';

jest.mock('@mcp-abap-adt/calm-client');
jest.mock('../../../server/auth/buildBroker');

const fakeRefresher = { getToken: jest.fn(), refreshToken: jest.fn() };
const fakeBroker = { createTokenRefresher: jest.fn(() => fakeRefresher) };

const oauth2Config: ICalmServerConfig = {
  mode: 'oauth2',
  baseUrl: 'https://t.eu10.alm.cloud.sap',
  authFlow: 'client_credentials',
  destination: 'DEFAULT',
  timeoutMs: 30_000,
  uaaUrl: 'https://uaa.example',
  uaaClientId: 'cid',
  uaaClientSecret: 'secret',
};

describe('buildCalmClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (buildAuthBroker as jest.Mock).mockResolvedValue(fakeBroker);
  });

  test('oauth2: builds broker, passes refresher to CalmConnection', async () => {
    await buildCalmClient(oauth2Config);
    expect(buildAuthBroker).toHaveBeenCalledWith(oauth2Config, undefined);
    expect(fakeBroker.createTokenRefresher).toHaveBeenCalledWith('DEFAULT');
    expect(CalmConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'https://t.eu10.alm.cloud.sap',
        tokenRefresher: fakeRefresher,
        defaultTimeout: 30_000,
      }),
    );
  });

  test('oauth2 with logger: forwards logger to buildAuthBroker', async () => {
    const logger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    await buildCalmClient(oauth2Config, { logger: logger as any });
    expect(buildAuthBroker).toHaveBeenCalledWith(oauth2Config, logger);
  });

  test('sandbox: bypasses broker, uses apiKey path', async () => {
    const sandboxConfig: ICalmServerConfig = {
      mode: 'sandbox',
      baseUrl: 'https://sandbox.api.sap.com/SAPCALM',
      authFlow: 'client_credentials',
      destination: 'DEFAULT',
      timeoutMs: 30_000,
      apiKey: 'sk',
    };
    await buildCalmClient(sandboxConfig);
    expect(buildAuthBroker).not.toHaveBeenCalled();
    expect(CalmConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'https://sandbox.api.sap.com/SAPCALM',
        apiKey: 'sk',
      }),
    );
  });
});
