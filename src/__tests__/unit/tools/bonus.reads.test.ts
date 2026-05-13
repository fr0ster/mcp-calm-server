import { CalmApiError } from '@mcp-abap-adt/calm-client';
import { listDocumentStatusesTool } from '../../../tools/documents/listDocumentStatuses';
import { listDocumentTypesTool } from '../../../tools/documents/listDocumentTypes';
import { listExternalReferencesTool } from '../../../tools/features/listExternalReferences';
import { getProgramTool } from '../../../tools/projects/getProgram';
import { listProgramsTool } from '../../../tools/projects/listPrograms';
import { listTeamMembersTool } from '../../../tools/projects/listTeamMembers';
import { listTimeboxesTool } from '../../../tools/projects/listTimeboxes';
import { listDeliverablesTool } from '../../../tools/tasks/listDeliverables';
import { listTaskReferencesTool } from '../../../tools/tasks/listTaskReferences';
import { listWorkstreamsTool } from '../../../tools/tasks/listWorkstreams';
import { listTestActionsTool } from '../../../tools/testCases/listTestActions';
import { listTestActivitiesTool } from '../../../tools/testCases/listTestActivities';
import { mockCalm } from '../../helpers/mockCalm';

describe('bonus read tools (M16)', () => {
  // ---------- documents ----------
  describe('calm_documents_list_statuses', () => {
    test('unwraps collection.value into items[]', async () => {
      const { calm } = mockCalm(() => ({
        value: [{ code: 1, name: 'Open' }],
      }));
      const res = await listDocumentStatusesTool.handler({ calm }, {});
      expect(res.items).toEqual([{ code: 1, name: 'Open' }]);
    });

    test('NETWORK error maps through', async () => {
      const { calm } = mockCalm(() =>
        CalmApiError.fromNetwork(new Error('off')),
      );
      await expect(
        listDocumentStatusesTool.handler({ calm }, {}),
      ).rejects.toMatchObject({ code: 'NETWORK' });
    });
  });

  describe('calm_documents_list_types', () => {
    test('unwraps collection.value into items[]', async () => {
      const { calm } = mockCalm(() => ({
        value: [{ code: 'NOTE', name: 'Note' }],
      }));
      const res = await listDocumentTypesTool.handler({ calm }, {});
      expect(res.items).toEqual([{ code: 'NOTE', name: 'Note' }]);
    });
  });

  // ---------- projects ----------
  describe('calm_projects_get_program', () => {
    test('rejects missing id', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        getProgramTool.handler({ calm }, {} as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('passes id through to calm.projects.getProgram', async () => {
      const { calm, calls } = mockCalm(() => ({ id: 'pg1', name: 'P' }));
      const res = await getProgramTool.handler({ calm }, { id: 'pg1' });
      expect(calls[0]).toMatchObject({
        service: 'projects',
        method: 'getProgram',
        args: ['pg1'],
      });
      expect(res.id).toBe('pg1');
    });
  });

  describe('calm_projects_list_programs', () => {
    test('returns paginated items', async () => {
      const { calm } = mockCalm(() => ({
        value: [{ id: 'pg1', name: 'P' }],
      }));
      const res = await listProgramsTool.handler({ calm }, { limit: 5 });
      expect(res.items).toHaveLength(1);
    });
  });

  describe('calm_projects_list_team_members', () => {
    test('rejects missing projectId', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        listTeamMembersTool.handler({ calm }, {} as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('passes projectId positionally to calm.projects.listTeamMembers', async () => {
      const { calm, calls } = mockCalm(() => ({ value: [] }));
      await listTeamMembersTool.handler({ calm }, { projectId: 'P', limit: 2 });
      expect(calls[0]).toMatchObject({
        service: 'projects',
        method: 'listTeamMembers',
      });
      expect(calls[0].args[0]).toBe('P');
    });
  });

  describe('calm_projects_list_timeboxes', () => {
    test('rejects missing projectId', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        listTimeboxesTool.handler({ calm }, {} as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('passes projectId positionally to calm.projects.listTimeboxes', async () => {
      const { calm, calls } = mockCalm(() => ({ value: [] }));
      await listTimeboxesTool.handler({ calm }, { projectId: 'P' });
      expect(calls[0]).toMatchObject({
        service: 'projects',
        method: 'listTimeboxes',
      });
      expect(calls[0].args[0]).toBe('P');
    });
  });

  // ---------- features ----------
  describe('calm_features_list_external_references', () => {
    test('returns items[] without filter when no parentUuid', async () => {
      const { calm, calls } = mockCalm(() => ({
        value: [{ id: 'JIRA-1', name: 'N' }],
      }));
      const res = await listExternalReferencesTool.handler({ calm }, {});
      expect(res.items).toHaveLength(1);
      expect(calls[0]).toMatchObject({
        service: 'features',
        method: 'listExternalReferences',
      });
    });

    test('builds parentUuid filter when supplied', async () => {
      const { calm, calls } = mockCalm(() => ({ value: [] }));
      await listExternalReferencesTool.handler({ calm }, { parentUuid: 'f1' });
      expect(decodeURIComponent(calls[0].url ?? '')).toContain(
        "parentUuid eq 'f1'",
      );
    });
  });

  // ---------- tasks ----------
  describe('calm_tasks_list_deliverables', () => {
    test('rejects missing projectId', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        listDeliverablesTool.handler({ calm }, {} as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('forwards projectId positionally to calm.tasks.listDeliverables', async () => {
      const { calm, calls } = mockCalm(() => ({
        value: [{ id: 'd1', name: 'D' }],
      }));
      const res = await listDeliverablesTool.handler(
        { calm },
        { projectId: 'P' },
      );
      expect(res.items).toHaveLength(1);
      expect(calls[0]).toMatchObject({
        service: 'tasks',
        method: 'listDeliverables',
      });
      expect(calls[0].args[0]).toBe('P');
    });
  });

  describe('calm_tasks_list_workstreams', () => {
    test('rejects missing projectId', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        listWorkstreamsTool.handler({ calm }, {} as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('forwards projectId positionally to calm.tasks.listWorkstreams', async () => {
      const { calm, calls } = mockCalm(() => ({
        value: [{ id: 'w1', name: 'W' }],
      }));
      const res = await listWorkstreamsTool.handler(
        { calm },
        { projectId: 'P' },
      );
      expect(res.items).toHaveLength(1);
      expect(calls[0]).toMatchObject({
        service: 'tasks',
        method: 'listWorkstreams',
      });
      expect(calls[0].args[0]).toBe('P');
    });
  });

  describe('calm_tasks_list_references', () => {
    test('rejects missing taskId', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        listTaskReferencesTool.handler({ calm }, {} as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('passes taskId positionally to calm.tasks.listReferences', async () => {
      const { calm, calls } = mockCalm(() => ({ value: [] }));
      await listTaskReferencesTool.handler({ calm }, { taskId: 't1' });
      expect(calls[0]).toMatchObject({
        service: 'tasks',
        method: 'listReferences',
      });
      expect(calls[0].args[0]).toBe('t1');
    });
  });

  // ---------- testCases ----------
  describe('calm_test_cases_list_activities', () => {
    test('returns items', async () => {
      const { calm } = mockCalm(() => ({
        value: [{ uuid: 'a1', title: 'A' }],
      }));
      const res = await listTestActivitiesTool.handler({ calm }, {});
      expect(res.items).toHaveLength(1);
    });

    test('builds parent_ID filter when supplied', async () => {
      const { calm, calls } = mockCalm(() => ({ value: [] }));
      await listTestActivitiesTool.handler({ calm }, { parent_ID: 'tc1' });
      expect(decodeURIComponent(calls[0].url ?? '')).toContain(
        "parent_ID eq 'tc1'",
      );
    });
  });

  describe('calm_test_cases_list_actions', () => {
    test('returns items', async () => {
      const { calm } = mockCalm(() => ({
        value: [{ uuid: 'ac1', title: 'A' }],
      }));
      const res = await listTestActionsTool.handler({ calm }, {});
      expect(res.items).toHaveLength(1);
    });
  });
});
