import { buildAuthBroker } from '../../../server/auth/buildBroker';
import { buildCalmClient } from '../../../server/buildClient';
import type { ICalmServerConfig } from '../../../server/config';
import { createCalmConnection } from '../../../server/connection/createCalmConnection';

jest.mock('@mcp-abap-adt/calm-client', () => ({
  CalmClient: jest.fn(),
}));
jest.mock('../../../server/auth/buildBroker');
jest.mock('../../../server/connection/createCalmConnection');

const fakeRefresher = { getToken: jest.fn(), refreshToken: jest.fn() };
const fakeBroker = { createTokenRefresher: jest.fn(() => fakeRefresher) };

const oauth2Config: ICalmServerConfig = {
  mode: 'oauth2',
  baseUrl: 'https://t.eu10.alm.cloud.sap/api',
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

  test('oauth2: builds broker, injects refresher into the connection factory', async () => {
    await buildCalmClient(oauth2Config);
    expect(buildAuthBroker).toHaveBeenCalledWith(oauth2Config, undefined);
    expect(fakeBroker.createTokenRefresher).toHaveBeenCalledWith('DEFAULT');
    expect(createCalmConnection).toHaveBeenCalledWith(
      oauth2Config,
      expect.objectContaining({ tokenRefresher: fakeRefresher }),
    );
  });

  test('oauth2 with logger: forwards logger to broker and connection', async () => {
    const logger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    await buildCalmClient(oauth2Config, { logger: logger as never });
    expect(buildAuthBroker).toHaveBeenCalledWith(oauth2Config, logger);
    expect(createCalmConnection).toHaveBeenCalledWith(
      oauth2Config,
      expect.objectContaining({ tokenRefresher: fakeRefresher, logger }),
    );
  });

  test('sandbox: bypasses broker, factory builds the api-key connection', async () => {
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
    expect(createCalmConnection).toHaveBeenCalledWith(
      sandboxConfig,
      expect.objectContaining({ logger: undefined }),
    );
  });
});
