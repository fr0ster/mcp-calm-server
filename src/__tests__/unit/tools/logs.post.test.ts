import { CalmApiError } from '@mcp-abap-adt/calm-client';
import { postLogsTool } from '../../../tools/logs/postLogs';
import { mockCalm } from '../../helpers/mockCalm';

describe('calm_logs_post', () => {
  test('rejects when useCase missing', async () => {
    const { calm } = mockCalm(() => ({}));
    await expect(
      postLogsTool.handler({ calm }, {
        serviceId: 'svc',
        records: [{ a: 1 }],
      } as never),
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  test('rejects when serviceId missing', async () => {
    const { calm } = mockCalm(() => ({}));
    await expect(
      postLogsTool.handler({ calm }, {
        useCase: 'uc',
        records: [{ a: 1 }],
      } as never),
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  test('rejects when records missing', async () => {
    const { calm } = mockCalm(() => ({}));
    await expect(
      postLogsTool.handler({ calm }, {
        useCase: 'uc',
        serviceId: 'svc',
      } as never),
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  test('splits params from records and forwards to calm.logs.post', async () => {
    const { calm, calls } = mockCalm(() => ({ ingested: 1 }));
    const records = [{ msg: 'hello' }, { msg: 'world' }];
    const result = await postLogsTool.handler(
      { calm },
      {
        useCase: 'uc',
        serviceId: 'svc',
        version: '1',
        dev: true,
        tag: 't',
        records,
      },
    );
    expect(calls[0]).toMatchObject({
      service: 'logs',
      method: 'post',
      args: [
        { useCase: 'uc', serviceId: 'svc', version: '1', dev: true, tag: 't' },
        records,
      ],
    });
    expect(result).toEqual({ result: { ingested: 1 } });
  });

  test('HTTP_ERROR surfaces from the server', async () => {
    const { calm } = mockCalm(() => CalmApiError.fromHttp(502, 'bad gw'));
    await expect(
      postLogsTool.handler(
        { calm },
        { useCase: 'uc', serviceId: 'svc', records: [] },
      ),
    ).rejects.toMatchObject({ code: 'HTTP_ERROR' });
  });
});
