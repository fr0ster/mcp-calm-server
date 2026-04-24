import { CalmClient } from '@mcp-abap-adt/calm-client';
import { buildCalmClient } from '../../../server/buildClient';

describe('buildCalmClient', () => {
  test('sandbox mode returns a CalmClient instance', () => {
    const client = buildCalmClient({
      mode: 'sandbox',
      baseUrl: 'https://sandbox.api.sap.com/SAPCALM',
      apiKey: 'sk',
      timeoutMs: 30_000,
    });
    expect(client).toBeInstanceOf(CalmClient);
    expect(typeof client.getFeatures).toBe('function');
  });

  test('oauth2 mode returns a CalmClient instance', () => {
    const client = buildCalmClient({
      mode: 'oauth2',
      baseUrl: 'https://t.eu10.alm.cloud.sap',
      uaaUrl: 'https://uaa.example',
      uaaClientId: 'cid',
      uaaClientSecret: 'secret',
      timeoutMs: 30_000,
    });
    expect(client).toBeInstanceOf(CalmClient);
    expect(typeof client.getTasks).toBe('function');
  });

  test('all 9 resource handlers are reachable', () => {
    const client = buildCalmClient({
      mode: 'sandbox',
      baseUrl: 'https://x',
      apiKey: 'sk',
      timeoutMs: 30_000,
    });
    expect(client.getFeatures()).toBeDefined();
    expect(client.getDocuments()).toBeDefined();
    expect(client.getTestCases()).toBeDefined();
    expect(client.getHierarchy()).toBeDefined();
    expect(client.getAnalytics()).toBeDefined();
    expect(client.getProcessMonitoring()).toBeDefined();
    expect(client.getTasks()).toBeDefined();
    expect(client.getProjects()).toBeDefined();
    expect(client.getLogs()).toBeDefined();
  });
});
