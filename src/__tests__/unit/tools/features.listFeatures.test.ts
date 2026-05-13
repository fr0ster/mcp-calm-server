import { CalmApiError, type CalmClient } from '@mcp-abap-adt/calm-client';
import { listFeaturesTool } from '../../../tools/features/listFeatures';
import {
  CalmToolError,
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT,
} from '../../../utils';

interface IRecordedListCall {
  url?: string;
}

function mockCalmClient(respond: (calls: IRecordedListCall[]) => unknown): {
  calm: CalmClient;
  calls: IRecordedListCall[];
} {
  const calls: IRecordedListCall[] = [];
  const calm = {
    getFeatures: () => ({
      list: async (projectId: string, query: { toQueryString(): string }) => {
        const qs = query.toQueryString();
        const sep = qs ? '&' : '';
        calls.push({
          url: `/Features?projectId=${encodeURIComponent(projectId)}${sep}${qs.replace(/^\?/, '')}`,
        });
        const result = respond(calls);
        if (result instanceof Error) throw result;
        return result;
      },
    }),
  } as unknown as CalmClient;
  return { calm, calls };
}

async function invoke(
  args: Record<string, unknown>,
  respond: (calls: IRecordedListCall[]) => unknown = () => ({ value: [] }),
) {
  const { calm, calls } = mockCalmClient(respond);
  const result = await listFeaturesTool.handler({ calm }, args as never);
  return { result, calls };
}

describe('calm_features_list tool', () => {
  test('tool definition exposes required projectId + enum for fields', () => {
    const schema = listFeaturesTool.toolDefinition.inputSchema as {
      required: string[];
      properties: { fields: { items: { enum: string[] } } };
    };
    expect(schema.required).toContain('projectId');
    expect(schema.properties.fields.items.enum).toContain('uuid');
    expect(schema.properties.fields.items.enum).toContain('title');
  });

  test('rejects missing projectId with INVALID_ARGUMENT', async () => {
    const { calm } = mockCalmClient(() => ({ value: [] }));
    await expect(
      listFeaturesTool.handler({ calm }, {} as never),
    ).rejects.toBeInstanceOf(CalmToolError);
    await expect(
      listFeaturesTool.handler({ calm }, {} as never),
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  test('default list: emits projectId as URL param, default fields, default limit', async () => {
    const { calls } = await invoke({ projectId: 'P1' });
    const url = calls[0].url ?? '';
    expect(url).toContain('projectId=P1');
    expect(url).not.toContain("projectId%20eq%20'");
    expect(url).toContain(
      '$select=uuid,displayId,title,statusCode,priorityCode,modifiedAt',
    );
    expect(url).toContain(`$top=${DEFAULT_LIST_LIMIT}`);
  });

  test('composes status + priority + responsible filters with and (no projectId in $filter)', async () => {
    const { calls } = await invoke({
      projectId: 'P1',
      status: 'OPEN',
      priorityCode: 'HIGH',
      responsibleId: 'u1',
    });
    const url = calls[0].url ?? '';
    const decoded = decodeURIComponent(url);
    expect(url).toContain('projectId=P1');
    expect(decoded).not.toContain("projectId eq 'P1'");
    expect(decoded).toContain("statusCode eq 'OPEN'");
    expect(decoded).toContain("priorityCode eq 'HIGH'");
    expect(decoded).toContain("responsibleId eq 'u1'");
    expect(decoded).toContain(' and ');
  });

  test('passes raw projectId on the URL (apostrophe stays unencoded)', async () => {
    const { calls } = await invoke({ projectId: "o'reilly" });
    const url = calls[0].url ?? '';
    // encodeURIComponent leaves `'` alone per JS spec (it's in the
    // unreserved set); the Spring controller decodes the UUID anyway.
    expect(url).toContain("projectId=o'reilly");
  });

  test('fields param narrows $select', async () => {
    const { calls } = await invoke({
      projectId: 'P1',
      fields: ['uuid', 'title'],
    });
    expect(calls[0].url).toContain('$select=uuid,title');
  });

  test('limit is clamped to MAX_LIST_LIMIT', async () => {
    const { calls } = await invoke({ projectId: 'P1', limit: 99999 });
    expect(calls[0].url).toContain(`$top=${MAX_LIST_LIMIT}`);
  });

  test('offset emits $skip', async () => {
    const { calls } = await invoke({ projectId: 'P1', offset: 40 });
    expect(calls[0].url).toContain('$skip=40');
  });

  test('withCount emits $count=true', async () => {
    const { calls } = await invoke({ projectId: 'P1', withCount: true });
    expect(calls[0].url).toContain('$count=true');
  });

  test('response shape — items / count / nextOffset', async () => {
    const { result } = await invoke(
      { projectId: 'P1', limit: 2, withCount: true },
      () => ({
        value: [{ uuid: 'a' }, { uuid: 'b' }],
        '@odata.count': 57,
      }),
    );
    expect(result).toEqual({
      items: [{ uuid: 'a' }, { uuid: 'b' }],
      count: 57,
      nextOffset: 2,
    });
  });

  test('response: nextOffset undefined when items < limit', async () => {
    const { result } = await invoke({ projectId: 'P1', limit: 20 }, () => ({
      value: [{ uuid: 'a' }],
    }));
    expect(result).toMatchObject({ nextOffset: undefined });
  });

  test('CalmApiError NOT_FOUND → CalmToolError NOT_FOUND', async () => {
    await expect(
      invoke({ projectId: 'P1' }, () =>
        CalmApiError.fromNotFound('Feature', 'X'),
      ),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('CalmApiError ODATA_ERROR → ODATA_ERROR with serviceCode preserved', async () => {
    await expect(
      invoke({ projectId: 'P1' }, () =>
        CalmApiError.fromOData(400, { code: 'BAD_FILTER', message: 'nope' }),
      ),
    ).rejects.toMatchObject({ code: 'ODATA_ERROR', serviceCode: 'BAD_FILTER' });
  });

  test('CalmApiError NETWORK → user-friendly message', async () => {
    await expect(
      invoke({ projectId: 'P1' }, () =>
        CalmApiError.fromNetwork(new Error('econnrefused')),
      ),
    ).rejects.toMatchObject({
      code: 'NETWORK',
      message: expect.stringMatching(/unreachable/i),
    });
  });
});
