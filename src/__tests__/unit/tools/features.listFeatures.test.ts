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
      list: async (query: { toQueryString(): string }) => {
        const qs = query.toQueryString();
        calls.push({ url: `/Features${qs}` });
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

  test('default list: applies projectId filter, default fields, default limit', async () => {
    const { calls } = await invoke({ projectId: 'P1' });
    const url = calls[0].url ?? '';
    expect(decodeURIComponent(url)).toContain("projectId eq 'P1'");
    expect(url).toContain(
      '$select=uuid,displayId,title,statusCode,priorityCode,modifiedAt',
    );
    expect(url).toContain(`$top=${DEFAULT_LIST_LIMIT}`);
  });

  test('composes status + priority + responsible filters with and', async () => {
    const { calls } = await invoke({
      projectId: 'P1',
      status: 'OPEN',
      priorityCode: 'HIGH',
      responsibleId: 'u1',
    });
    const decoded = decodeURIComponent(calls[0].url ?? '');
    expect(decoded).toContain("projectId eq 'P1'");
    expect(decoded).toContain("statusCode eq 'OPEN'");
    expect(decoded).toContain("priorityCode eq 'HIGH'");
    expect(decoded).toContain("responsibleId eq 'u1'");
    expect(decoded).toContain(' and ');
  });

  test('escapes single quotes in projectId filter literal', async () => {
    const { calls } = await invoke({ projectId: "o'reilly" });
    const url = calls[0].url ?? '';
    expect(url).toContain('%27o%27%27reilly%27');
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
