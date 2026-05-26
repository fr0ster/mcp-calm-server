import { CalmApiError } from '@mcp-abap-adt/calm-client';
import type { ITokenRefresher } from '@mcp-abap-adt/interfaces';
import type { ICalmServerConfig } from '../../../server/config';
import { AbstractCalmConnection } from '../../../server/connection/AbstractCalmConnection';
import { createCalmConnection } from '../../../server/connection/createCalmConnection';
import { OAuth2CalmConnection } from '../../../server/connection/OAuth2CalmConnection';
import { SandboxCalmConnection } from '../../../server/connection/SandboxCalmConnection';

// Concrete test double exposing protected hooks with a no-auth header.
class TestConn extends AbstractCalmConnection {
  protected async attachAuth(): Promise<Record<string, string>> {
    return { 'X-Test-Auth': 'yes' };
  }
}

const okJson = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('AbstractCalmConnection (fetch)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('builds service URL by pure concatenation, no /api injection', async () => {
    const conn = new TestConn({ baseUrl: 'https://t.alm.cloud.sap/api' });
    expect(await conn.getServiceUrl('features')).toBe(
      'https://t.alm.cloud.sap/api/calm-features/v1',
    );
  });

  it('GETs through fetch and returns parsed JSON in ICalmResponse shape', async () => {
    const spy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okJson({ value: [1, 2] }));
    const conn = new TestConn({ baseUrl: 'https://t.alm.cloud.sap/api' });
    const res = await conn.makeRequest<{ value: number[] }>({
      service: 'features',
      url: '/Features',
      method: 'GET',
    });
    expect(res.status).toBe(200);
    expect(res.data.value).toEqual([1, 2]);
    const calledUrl = (spy.mock.calls[0][0] as string) ?? '';
    expect(calledUrl).toBe(
      'https://t.alm.cloud.sap/api/calm-features/v1/Features',
    );
    expect((spy.mock.calls[0][1] as RequestInit).headers).toMatchObject({
      'X-Test-Auth': 'yes',
    });
  });

  it('throws CalmApiError(HTTP_ERROR) on a 404 with text body', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('Not Found', { status: 404 }));
    const conn = new TestConn({ baseUrl: 'https://t.alm.cloud.sap/api' });
    await expect(
      conn.makeRequest({ service: 'tasks', url: '/tasks', method: 'GET' }),
    ).rejects.toMatchObject({
      name: 'CalmApiError',
      code: 'HTTP_ERROR',
      status: 404,
    });
  });

  it('throws CalmApiError(ODATA_ERROR) on a 400 OData envelope', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        okJson({ error: { code: 'X/1', message: 'bad' } }, 400),
      );
    const conn = new TestConn({ baseUrl: 'https://t.alm.cloud.sap/api' });
    await expect(
      conn.makeRequest({ service: 'tasks', url: '/tasks', method: 'GET' }),
    ).rejects.toMatchObject({ code: 'ODATA_ERROR', status: 400 });
  });

  it('returns a Buffer with exact bytes for a binary (protobuf) response', async () => {
    // Logs returns application/x-protobuf. response.text() would mangle the
    // bytes through UTF-8; the tool needs the raw bytes to decode OTLP.
    const bytes = new Uint8Array([0x0a, 0x00, 0xff, 0xfe, 0x80, 0x01]);
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(bytes, {
        status: 200,
        headers: { 'content-type': 'application/x-protobuf' },
      }),
    );
    const conn = new TestConn({ baseUrl: 'https://t.alm.cloud.sap/api' });
    const res = await conn.makeRequest<Buffer>({
      service: 'logs',
      url: '/logs',
      method: 'GET',
    });
    expect(Buffer.isBuffer(res.data)).toBe(true);
    expect(Uint8Array.from(res.data)).toEqual(bytes);
  });

  it('serializes object params into the query string', async () => {
    const spy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okJson({ value: [] }));
    const conn = new TestConn({ baseUrl: 'https://t.alm.cloud.sap/api' });
    await conn.makeRequest({
      service: 'features',
      url: '/Features',
      method: 'GET',
      params: { $top: 1, projectId: 'abc' },
    });
    const url = spy.mock.calls[0][0] as string;
    expect(url).toContain('?');
    expect(url).toContain('%24top=1');
    expect(url).toContain('projectId=abc');
  });
});

describe('SandboxCalmConnection', () => {
  afterEach(() => jest.restoreAllMocks());
  it('sends the APIKey header', async () => {
    const spy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ value: [] }), { status: 200 }),
      );
    const conn = new SandboxCalmConnection({
      baseUrl: 'https://sandbox.api.sap.com/SAPCALM',
      apiKey: 'KEY123',
    });
    await conn.makeRequest({
      service: 'features',
      url: '/Features',
      method: 'GET',
    });
    expect((spy.mock.calls[0][1] as RequestInit).headers).toMatchObject({
      APIKey: 'KEY123',
    });
  });
});

describe('OAuth2CalmConnection', () => {
  afterEach(() => jest.restoreAllMocks());

  const refresher = (
    token = 'tok',
  ): ITokenRefresher & { refreshes: number } => {
    const r = {
      refreshes: 0,
      async getToken() {
        return token;
      },
      async refreshToken() {
        this.refreshes += 1;
        return `${token}-r${this.refreshes}`;
      },
    };
    return r;
  };

  it('sends a Bearer token from the refresher', async () => {
    const spy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ value: [] }), { status: 200 }),
      );
    const conn = new OAuth2CalmConnection({
      baseUrl: 'https://t.alm.cloud.sap/api',
      tokenRefresher: refresher('abc'),
    });
    await conn.makeRequest({ service: 'tasks', url: '/tasks', method: 'GET' });
    expect((spy.mock.calls[0][1] as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer abc',
    });
  });

  it('refreshes once and retries on a 401', async () => {
    const r = refresher('abc');
    const spy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('nope', { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ value: [] }), { status: 200 }),
      );
    const conn = new OAuth2CalmConnection({
      baseUrl: 'https://t.alm.cloud.sap/api',
      tokenRefresher: r,
    });
    const res = await conn.makeRequest({
      service: 'tasks',
      url: '/tasks',
      method: 'GET',
    });
    expect(res.status).toBe(200);
    expect(r.refreshes).toBe(1);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('propagates a non-auth 404 as CalmApiError without retry', async () => {
    const r = refresher('abc');
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('gone', { status: 404 }));
    const conn = new OAuth2CalmConnection({
      baseUrl: 'https://t.alm.cloud.sap/api',
      tokenRefresher: r,
    });
    await expect(
      conn.makeRequest({ service: 'tasks', url: '/tasks', method: 'GET' }),
    ).rejects.toMatchObject({ code: 'HTTP_ERROR', status: 404 });
    expect(r.refreshes).toBe(0);
  });

  it('normalizes a network failure ON THE RETRY into CalmApiError(NETWORK)', async () => {
    const r = refresher('abc');
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('nope', { status: 401 }))
      .mockRejectedValueOnce(new TypeError('socket hang up'));
    const conn = new OAuth2CalmConnection({
      baseUrl: 'https://t.alm.cloud.sap/api',
      tokenRefresher: r,
    });
    await expect(
      conn.makeRequest({ service: 'tasks', url: '/tasks', method: 'GET' }),
    ).rejects.toMatchObject({ name: 'CalmApiError', code: 'NETWORK' });
    expect(r.refreshes).toBe(1);
  });
});

describe('createCalmConnection', () => {
  it('returns an OAuth2 connection for oauth2 mode', async () => {
    const cfg: ICalmServerConfig = {
      mode: 'oauth2',
      baseUrl: 'https://t.alm.cloud.sap/api',
      uaaUrl: 'https://u.auth',
      uaaClientId: 'id',
      uaaClientSecret: 'secret',
      timeoutMs: 30_000,
      authFlow: 'client_credentials',
      destination: 'DEFAULT',
    };
    const conn = createCalmConnection(cfg);
    expect(await conn.getServiceUrl('features')).toBe(
      'https://t.alm.cloud.sap/api/calm-features/v1',
    );
  });

  it('returns a Sandbox connection for sandbox mode', async () => {
    const cfg: ICalmServerConfig = {
      mode: 'sandbox',
      baseUrl: 'https://sandbox.api.sap.com/SAPCALM',
      apiKey: 'KEY',
      timeoutMs: 30_000,
      authFlow: 'client_credentials',
      destination: 'DEFAULT',
    };
    const conn = createCalmConnection(cfg);
    expect(await conn.getServiceUrl('logs')).toBe(
      'https://sandbox.api.sap.com/SAPCALM/calm-logs/v1',
    );
  });

  it('honours an injected tokenRefresher override', async () => {
    const calls: string[] = [];
    const cfg: ICalmServerConfig = {
      mode: 'oauth2',
      baseUrl: 'https://t.alm.cloud.sap/api',
      uaaUrl: 'https://u.auth',
      uaaClientId: 'id',
      uaaClientSecret: 'secret',
      timeoutMs: 30_000,
      authFlow: 'client_credentials',
      destination: 'DEFAULT',
    };
    const conn = createCalmConnection(cfg, {
      tokenRefresher: {
        async getToken() {
          calls.push('get');
          return 'injected';
        },
        async refreshToken() {
          return 'injected';
        },
      },
    });
    const spy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ value: [] }), { status: 200 }),
      );
    await conn.makeRequest({ service: 'tasks', url: '/tasks', method: 'GET' });
    expect(calls).toContain('get');
    expect((spy.mock.calls[0][1] as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer injected',
    });
    spy.mockRestore();
  });
});

describe('AbstractCalmConnection logging', () => {
  afterEach(() => jest.restoreAllMocks());

  const fakeLogger = () => {
    const debug: string[] = [];
    const warn: string[] = [];
    return {
      logger: {
        info: () => {},
        error: () => {},
        warn: (m: string) => warn.push(m),
        debug: (m: string) => debug.push(m),
      },
      debug,
      warn,
    };
  };

  it('logs request + response at debug on success', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ value: [] }), { status: 200 }),
      );
    const { logger, debug } = fakeLogger();
    const conn = new TestConn({
      baseUrl: 'https://t.alm.cloud.sap/api',
      logger,
    });
    await conn.makeRequest({
      service: 'features',
      url: '/Features',
      method: 'GET',
    });
    expect(
      debug.some(
        (l) => l.includes('GET') && l.includes('/calm-features/v1/Features'),
      ),
    ).toBe(true);
    expect(debug.some((l) => l.includes('200'))).toBe(true);
  });

  it('logs HTTP error at debug (expected operational signal), not warn', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('nope', { status: 403 }));
    const { logger, debug, warn } = fakeLogger();
    const conn = new TestConn({
      baseUrl: 'https://t.alm.cloud.sap/api',
      logger,
    });
    await expect(
      conn.makeRequest({ service: 'tasks', url: '/tasks', method: 'GET' }),
    ).rejects.toMatchObject({ status: 403 });
    expect(debug.some((l) => l.includes('403'))).toBe(true);
    expect(warn).toHaveLength(0);
  });

  it('logs transport failure at warn', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new TypeError('socket hang up'));
    const { logger, warn } = fakeLogger();
    const conn = new TestConn({
      baseUrl: 'https://t.alm.cloud.sap/api',
      logger,
    });
    await expect(
      conn.makeRequest({ service: 'tasks', url: '/tasks', method: 'GET' }),
    ).rejects.toMatchObject({ code: 'NETWORK' });
    expect(warn.some((l) => l.includes('failed'))).toBe(true);
  });
});
