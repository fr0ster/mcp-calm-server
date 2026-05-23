import { CalmApiError } from '@mcp-abap-adt/calm-client';
import { AbstractCalmConnection } from '../../../server/connection/AbstractCalmConnection';

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
    ).rejects.toMatchObject({ name: 'CalmApiError', code: 'HTTP_ERROR', status: 404 });
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
