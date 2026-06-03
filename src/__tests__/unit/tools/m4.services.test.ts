import { CalmApiError } from '@mcp-abap-adt/calm-client';
import protobuf from 'protobufjs';
import { listAnalyticsProvidersTool } from '../../../tools/analytics/listAnalyticsProviders';
import { queryAnalyticsTool } from '../../../tools/analytics/queryAnalytics';
import { getDocumentTool } from '../../../tools/documents/getDocument';
import { listDocumentsTool } from '../../../tools/documents/listDocuments';
import { getHierarchyWithChildrenTool } from '../../../tools/hierarchy/getHierarchyWithChildren';
import { listHierarchyTool } from '../../../tools/hierarchy/listHierarchy';
import { getLogsTool } from '../../../tools/logs/getLogs';
import { OTLP_LOGS_PROTO } from '../../../tools/logs/otlpProto';
import { listBusinessProcessesTool } from '../../../tools/processMonitoring/listBusinessProcesses';
import { getProjectTool } from '../../../tools/projects/getProject';
import { listProjectsTool } from '../../../tools/projects/listProjects';
import { getTaskTool } from '../../../tools/tasks/getTask';
import { listTaskCommentsTool } from '../../../tools/tasks/listTaskComments';
import { listTasksTool } from '../../../tools/tasks/listTasks';
import { getTestCaseTool } from '../../../tools/testCases/getTestCase';
import { listTestCasesTool } from '../../../tools/testCases/listTestCases';
import { mockCalm } from '../../helpers/mockCalm';

describe('M4 — read-only tools across 8 services', () => {
  describe('documents', () => {
    test('list emits projectId + typeCode filter, default fields', async () => {
      const { calm, calls } = mockCalm(() => ({ value: [] }));
      await listDocumentsTool.handler(
        { calm },
        { projectId: 'P1', typeCode: 'SPEC' },
      );
      const url = decodeURIComponent(calls[0].url ?? '');
      expect(url).toContain("projectId eq 'P1'");
      expect(url).toContain("documentTypeCode eq 'SPEC'");
    });

    test('get validates uuid', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        getDocumentTool.handler({ calm }, {} as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });
  });

  describe('testCases', () => {
    test('list routes via getTestCases', async () => {
      const { calm, calls } = mockCalm(() => ({ value: [] }));
      await listTestCasesTool.handler({ calm }, { projectId: 'P1' });
      expect(calls[0].service).toBe('testCases');
      expect(calls[0].method).toBe('list');
    });

    test('get validates uuid', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        getTestCaseTool.handler({ calm }, {} as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });
  });

  describe('hierarchy', () => {
    test('list filters by rootNodeUuid', async () => {
      const { calm, calls } = mockCalm(() => ({ value: [] }));
      await listHierarchyTool.handler({ calm }, { rootNodeUuid: 'r1' });
      expect(decodeURIComponent(calls[0].url ?? '')).toContain(
        "rootNodeUuid eq 'r1'",
      );
    });

    test('getWithChildren defaults relations to [toChildNodes, toParentNode]', async () => {
      const { calm, calls } = mockCalm(() => ({ uuid: 'n1', children: [] }));
      await getHierarchyWithChildrenTool.handler({ calm }, { uuid: 'n1' });
      expect(calls[0].args[1]).toEqual(['toChildNodes', 'toParentNode']);
    });

    test('getWithChildren accepts custom relations', async () => {
      const { calm, calls } = mockCalm(() => ({}));
      await getHierarchyWithChildrenTool.handler(
        { calm },
        { uuid: 'n1', relations: ['toExternalRefs'] },
      );
      expect(calls[0].args[1]).toEqual(['toExternalRefs']);
    });
  });

  describe('analytics', () => {
    test('query emits endpoint + filter', async () => {
      const { calm, calls } = mockCalm(() => ({ value: [{ id: 1 }] }));
      const result = await queryAnalyticsTool.handler(
        { calm },
        { endpoint: 'Tasks', filter: "status eq 'OPEN'" },
      );
      expect(calls[0].service).toBe('analytics');
      expect(calls[0].method).toBe('getEndpoint');
      expect(calls[0].args[0]).toBe('Tasks');
      expect(result.endpoint).toBe('Tasks');
      expect(result.rows).toEqual([{ id: 1 }]);
    });

    test('query unwraps array responses too', async () => {
      const { calm } = mockCalm(() => [{ id: 1 }, { id: 2 }]);
      const result = await queryAnalyticsTool.handler(
        { calm },
        { endpoint: 'Defects' },
      );
      expect(result.rows).toHaveLength(2);
    });

    test('listProviders returns the static catalog', async () => {
      const { calm } = mockCalm(() => ({
        providers: [{ name: 'Tasks', description: 'tasks data' }],
        note: 'pick one',
      }));
      const result = await listAnalyticsProvidersTool.handler({ calm }, {});
      expect(result.providers).toEqual([
        { name: 'Tasks', description: 'tasks data' },
      ]);
    });
  });

  describe('processMonitoring', () => {
    test('listBusinessProcesses routes correctly', async () => {
      const { calm, calls } = mockCalm(() => ({ value: [] }));
      await listBusinessProcessesTool.handler({ calm }, {});
      expect(calls[0].service).toBe('processMonitoring');
      expect(calls[0].method).toBe('listBusinessProcesses');
    });
  });

  describe('tasks', () => {
    test('list passes only projectId; status is filtered client-side', async () => {
      // The Tasks service rejects every OData query param ($select,
      // $top, $filter…) as "not supported yet" — only `?projectId=`
      // is honoured on the URL. listTasksTool therefore calls
      // calm.getTasks().list with just a positional projectId and
      // performs status/assignee filtering + pagination locally.
      const { calm, calls } = mockCalm(() => ({
        value: [
          { id: 't1', status: 'OPEN', title: 'A' },
          { id: 't2', status: 'CLOSED', title: 'B' },
        ],
      }));
      const res = await listTasksTool.handler(
        { calm },
        { projectId: 'P1', status: 'OPEN' },
      );
      expect(calls[0].method).toBe('list');
      expect(calls[0].args).toEqual(['P1']);
      expect(res.items).toEqual([{ id: 't1', status: 'OPEN', title: 'A' }]);
    });

    test('list rejects without projectId', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        listTasksTool.handler({ calm }, {} as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('get id passthrough', async () => {
      const { calm, calls } = mockCalm(() => ({ id: 't1' }));
      await getTaskTool.handler({ calm }, { id: 't1' });
      expect(calls[0].args).toEqual(['t1']);
    });

    test('listComments passes taskId + query', async () => {
      const { calm, calls } = mockCalm(() => ({ value: [] }));
      await listTaskCommentsTool.handler({ calm }, { taskId: 't1' });
      expect(calls[0].method).toBe('listComments');
      expect(calls[0].args[0]).toBe('t1');
    });
  });

  describe('projects', () => {
    test('list filters by programId', async () => {
      const { calm, calls } = mockCalm(() => ({ value: [] }));
      await listProjectsTool.handler({ calm }, { programId: 'PR1' });
      expect(decodeURIComponent(calls[0].url ?? '')).toContain(
        "programId eq 'PR1'",
      );
    });

    test('get rejects missing id', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        getProjectTool.handler({ calm }, {} as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('NOT_FOUND maps correctly', async () => {
      const { calm } = mockCalm(() =>
        CalmApiError.fromNotFound('Project', 'p1'),
      );
      await expect(
        getProjectTool.handler({ calm }, { id: 'p1' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('logs', () => {
    test('get rejects missing provider', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        getLogsTool.handler({ calm }, {} as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('get forwards provider + serviceId + time window', async () => {
      const { calm, calls } = mockCalm(() => ({ logs: [] }));
      await getLogsTool.handler(
        { calm },
        {
          provider: 'sap-alm',
          serviceId: 'svc-1',
          from: '2026-01-01',
          to: '2026-02-01',
          limit: 50,
        },
      );
      expect(calls[0].service).toBe('logs');
      expect(calls[0].method).toBe('get');
      const params = calls[0].args[0] as Record<string, unknown>;
      expect(params).toMatchObject({
        provider: 'sap-alm',
        serviceId: 'svc-1',
        from: '2026-01-01',
        to: '2026-02-01',
        limit: 50,
      });
    });

    test('get forwards category / version / format query params', async () => {
      const { calm, calls } = mockCalm(() => ({ logs: [] }));
      await getLogsTool.handler(
        { calm },
        {
          provider: 'exm.im',
          serviceId: 'bc6c21e9-f673-4917-b2ad-6618b8e75be9',
          category: 'ABAP Runtime',
          version: 'V1',
          format: 'protobuf-json',
          period: '60M',
        },
      );
      const params = calls[0].args[0] as Record<string, unknown>;
      expect(params).toMatchObject({
        provider: 'exm.im',
        serviceId: 'bc6c21e9-f673-4917-b2ad-6618b8e75be9',
        category: 'ABAP Runtime',
        version: 'V1',
        format: 'protobuf-json',
        period: '60M',
      });
    });

    test('get forwards an explicit onLimit strategy', async () => {
      const { calm, calls } = mockCalm(() => ({ logs: [] }));
      await getLogsTool.handler(
        { calm },
        { provider: 'sap-alm', limit: 5, onLimit: 'reject' },
      );
      const params = calls[0].args[0] as Record<string, unknown>;
      expect(params).toMatchObject({ limit: 5, onLimit: 'reject' });
    });

    test('get decodes an OTLP protobuf buffer into canonical JSON', async () => {
      const bytes = encodeOtlpSample();
      const { calm } = mockCalm(() => Buffer.from(bytes));
      const res = (await getLogsTool.handler(
        { calm },
        { provider: 'sap-alm' },
      )) as { records: { resourceLogs: unknown[] } };
      expect(Array.isArray(res.records.resourceLogs)).toBe(true);
      expect(res.records.resourceLogs).toHaveLength(1);
    });

    test('get returns base64 protobuf when raw=true', async () => {
      const bytes = encodeOtlpSample();
      const { calm } = mockCalm(() => Buffer.from(bytes));
      const res = (await getLogsTool.handler(
        { calm },
        { provider: 'sap-alm', raw: true },
      )) as { records: string; encoding?: string };
      expect(res.encoding).toBe('base64');
      expect(res.records).toBe(Buffer.from(bytes).toString('base64'));
    });

    test('get passes a non-binary (empty) response through unchanged', async () => {
      const { calm } = mockCalm(() => ({}));
      const res = (await getLogsTool.handler(
        { calm },
        { provider: 'sap-alm' },
      )) as { records: unknown };
      expect(res.records).toEqual({});
    });
  });
});

function encodeOtlpSample(): Uint8Array {
  const root = protobuf.parse(OTLP_LOGS_PROTO).root;
  const Req = root.lookupType(
    'opentelemetry.proto.logs.v1.ExportLogsServiceRequest',
  );
  return Req.encode(
    Req.create({
      resourceLogs: [
        {
          resource: {
            attributes: [
              { key: 'service.name', value: { stringValue: 'E19.100' } },
            ],
          },
          scopeLogs: [{ logRecords: [{ severityText: 'Error' }] }],
        },
      ],
    }),
  ).finish();
}
