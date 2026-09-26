import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSessionStore } from '../../../../server/auth/buildBroker';
import { TargetUrlSessionStore } from '../../../../server/auth/targetUrlSessionStore';

const BASE_URL = 'https://t.eu10.alm.cloud.sap/api';

/**
 * Runs against the real file store, since what is protected is the user's
 * `{destination}.env` — the file `mcp-auth` writes.
 */
describe('TargetUrlSessionStore', () => {
  let dir: string;
  const file = () => join(dir, 'DEFAULT.env');
  const read = () => readFileSync(file(), 'utf8');

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'calm-session-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  // The store exactly as the server builds it: a default URL given to the
  // store itself would be written into a session it creates.
  function wrap(): TargetUrlSessionStore {
    return new TargetUrlSessionStore(createSessionStore(dir), BASE_URL);
  }

  test('reads answer CALM_BASE_URL for a session that holds no URL', async () => {
    writeFileSync(
      file(),
      'XSUAA_JWT_TOKEN=old\nXSUAA_REFRESH_TOKEN=rt\nXSUAA_UAA_URL=https://uaa\nXSUAA_UAA_CLIENT_ID=c\nXSUAA_UAA_CLIENT_SECRET=s\n',
    );
    const store = wrap();
    expect((await store.getConnectionConfig('DEFAULT'))?.serviceUrl).toBe(
      BASE_URL,
    );
    expect((await store.loadSession('DEFAULT'))?.serviceUrl).toBe(BASE_URL);
  });

  test('a token write does not put CALM_BASE_URL into the session file', async () => {
    writeFileSync(
      file(),
      'XSUAA_JWT_TOKEN=old\nXSUAA_REFRESH_TOKEN=rt\nXSUAA_UAA_URL=https://uaa\nXSUAA_UAA_CLIENT_ID=c\nXSUAA_UAA_CLIENT_SECRET=s\n',
    );
    const store = wrap();
    // What auth-broker 3 writes after a token: the serviceUrl it resolved.
    await store.setConnectionConfig('DEFAULT', {
      serviceUrl: BASE_URL,
      authorizationToken: 'new',
      authType: 'jwt',
    });
    await store.saveSession('DEFAULT', {
      ...(await store.loadSession('DEFAULT')),
      refreshToken: 'rt2',
    });
    const content = read();
    expect(content).toContain('XSUAA_JWT_TOKEN=new');
    expect(content).toContain('XSUAA_REFRESH_TOKEN=rt2');
    expect(content).not.toContain('XSUAA_MCP_URL');
  });

  test('a URL the session holds is kept, not replaced by CALM_BASE_URL', async () => {
    writeFileSync(
      file(),
      'XSUAA_MCP_URL=https://own.example\nXSUAA_JWT_TOKEN=old\n',
    );
    const store = wrap();
    await store.setConnectionConfig('DEFAULT', {
      serviceUrl: BASE_URL,
      authorizationToken: 'new',
    });
    expect(read()).toContain('XSUAA_MCP_URL=https://own.example');
    expect(read()).toContain('XSUAA_JWT_TOKEN=new');
  });

  test('the first token write creates a session file without CALM_BASE_URL', async () => {
    // No session yet: the store creates one. Built with CALM_BASE_URL as its
    // default, it wrote XSUAA_MCP_URL into the new file (found in review).
    const store = wrap();
    await store.setConnectionConfig('DEFAULT', {
      serviceUrl: BASE_URL,
      authorizationToken: 'first',
      authType: 'jwt',
    });
    const content = read();
    expect(content).toContain('XSUAA_JWT_TOKEN=first');
    expect(content).not.toContain(BASE_URL);
    expect(content).not.toContain('XSUAA_MCP_URL');
  });
});
