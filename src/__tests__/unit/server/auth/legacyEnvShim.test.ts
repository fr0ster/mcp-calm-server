import { buildLegacyShimStore } from '../../../../server/auth/legacyEnvShim';
import type { ICalmServerConfig } from '../../../../server/config';

const baseConfig: ICalmServerConfig = {
  mode: 'oauth2',
  baseUrl: 'https://t.eu10.alm.cloud.sap',
  authFlow: 'client_credentials',
  destination: 'DEFAULT',
  timeoutMs: 30_000,
};

describe('buildLegacyShimStore', () => {
  test('returns null when no inline UAA creds present', async () => {
    const store = await buildLegacyShimStore({ ...baseConfig });
    expect(store).toBeNull();
  });

  test('returns seeded store when all three UAA fields present', async () => {
    const store = await buildLegacyShimStore({
      ...baseConfig,
      uaaUrl: 'https://uaa.example',
      uaaClientId: 'cid',
      uaaClientSecret: 'secret',
    });
    expect(store).not.toBeNull();
    const authConfig = await store!.getAuthorizationConfig('DEFAULT');
    expect(authConfig?.uaaUrl).toBe('https://uaa.example');
    expect(authConfig?.uaaClientId).toBe('cid');
    expect(authConfig?.uaaClientSecret).toBe('secret');
  });

  test('returns null when only some UAA fields present (partial)', async () => {
    const store = await buildLegacyShimStore({
      ...baseConfig,
      uaaUrl: 'https://uaa.example',
      // missing uaaClientId, uaaClientSecret
    });
    expect(store).toBeNull();
  });
});
