import { readConfig } from '../../../server/config';

const ORIGINAL_ENV = { ...process.env };

function resetEnv(): void {
  // Clear any CALM_* vars the test might have set, then restore.
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('CALM_')) delete process.env[key];
  }
  for (const [k, v] of Object.entries(ORIGINAL_ENV)) {
    if (k.startsWith('CALM_') && v !== undefined) process.env[k] = v;
  }
}

describe('readConfig', () => {
  afterEach(resetEnv);

  test('throws when CALM_MODE is unset', () => {
    for (const k of Object.keys(process.env)) {
      if (k.startsWith('CALM_')) delete process.env[k];
    }
    expect(() => readConfig()).toThrow(/CALM_MODE is required/);
  });

  test('oauth2 mode requires tenant + UAA creds', () => {
    for (const k of Object.keys(process.env)) {
      if (k.startsWith('CALM_')) delete process.env[k];
    }
    process.env.CALM_MODE = 'oauth2';
    expect(() => readConfig()).toThrow(/CALM_BASE_URL/);
  });

  test('oauth2 mode returns typed config', () => {
    for (const k of Object.keys(process.env)) {
      if (k.startsWith('CALM_')) delete process.env[k];
    }
    process.env.CALM_MODE = 'oauth2';
    process.env.CALM_BASE_URL = 'https://t.eu10.alm.cloud.sap';
    process.env.CALM_UAA_URL = 'https://uaa.example';
    process.env.CALM_UAA_CLIENT_ID = 'cid';
    process.env.CALM_UAA_CLIENT_SECRET = 'secret';
    const cfg = readConfig();
    expect(cfg).toMatchObject({
      mode: 'oauth2',
      baseUrl: 'https://t.eu10.alm.cloud.sap',
      uaaUrl: 'https://uaa.example',
      uaaClientId: 'cid',
      uaaClientSecret: 'secret',
    });
  });

  test('sandbox mode requires apiKey', () => {
    for (const k of Object.keys(process.env)) {
      if (k.startsWith('CALM_')) delete process.env[k];
    }
    process.env.CALM_MODE = 'sandbox';
    expect(() => readConfig()).toThrow(/CALM_API_KEY/);
  });

  test('sandbox mode defaults baseUrl', () => {
    for (const k of Object.keys(process.env)) {
      if (k.startsWith('CALM_')) delete process.env[k];
    }
    process.env.CALM_MODE = 'sandbox';
    process.env.CALM_API_KEY = 'sk';
    const cfg = readConfig();
    expect(cfg).toMatchObject({
      mode: 'sandbox',
      baseUrl: 'https://sandbox.api.sap.com/SAPCALM',
      apiKey: 'sk',
    });
  });

  test('CALM_TIMEOUT parsed into timeoutMs', () => {
    for (const k of Object.keys(process.env)) {
      if (k.startsWith('CALM_')) delete process.env[k];
    }
    process.env.CALM_MODE = 'sandbox';
    process.env.CALM_API_KEY = 'sk';
    process.env.CALM_TIMEOUT = '60000';
    expect(readConfig().timeoutMs).toBe(60000);
  });

  test('default timeoutMs when CALM_TIMEOUT absent', () => {
    for (const k of Object.keys(process.env)) {
      if (k.startsWith('CALM_')) delete process.env[k];
    }
    process.env.CALM_MODE = 'sandbox';
    process.env.CALM_API_KEY = 'sk';
    expect(readConfig().timeoutMs).toBe(30_000);
  });

  test('unknown CALM_MODE rejected', () => {
    for (const k of Object.keys(process.env)) {
      if (k.startsWith('CALM_')) delete process.env[k];
    }
    process.env.CALM_MODE = 'weird';
    expect(() => readConfig()).toThrow();
  });
});
