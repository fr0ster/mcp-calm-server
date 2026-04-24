import { CalmApiError } from '@mcp-abap-adt/calm-client';
import { listAnalyticsProvidersTool } from '../../../tools/analytics/listAnalyticsProviders';
import { queryAnalyticsTool } from '../../../tools/analytics/queryAnalytics';
import { getDocumentTool } from '../../../tools/documents/getDocument';
import { listDocumentsTool } from '../../../tools/documents/listDocuments';
import { getHierarchyWithChildrenTool } from '../../../tools/hierarchy/getHierarchyWithChildren';
import { listHierarchyTool } from '../../../tools/hierarchy/listHierarchy';
import { getLogsTool } from '../../../tools/logs/getLogs';
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
    test('list requires projectId, emits filter', async () => {
      const { calm, calls } = mockCalm(() => ({ value: [] }));
      await listTasksTool.handler(
        { calm },
        { projectId: 'P1', status: 'OPEN' },
      );
      const url = decodeURIComponent(calls[0].url ?? '');
      expect(url).toContain("projectId eq 'P1'");
      expect(url).toContain("status eq 'OPEN'");
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
  });
});
