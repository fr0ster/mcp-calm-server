import { CalmApiError } from '@mcp-abap-adt/calm-client';
import { createProjectTool } from '../../../tools/projects/createProject';
import { mockCalm } from '../../helpers/mockCalm';

describe('project CRUD tools', () => {
  describe('calm_projects_create', () => {
    test('rejects when name missing', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        createProjectTool.handler({ calm }, {} as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('forwards payload to calm.projects.create', async () => {
      const { calm, calls } = mockCalm(() => ({ id: 'P1', name: 'N' }));
      const result = await createProjectTool.handler(
        { calm },
        { name: 'N', description: 'd', programId: 'PG1' },
      );
      expect(calls[0]).toMatchObject({
        service: 'projects',
        method: 'create',
        args: [{ name: 'N', description: 'd', programId: 'PG1' }],
      });
      expect(result.id).toBe('P1');
    });

    test('ODATA_ERROR carries serviceCode', async () => {
      const { calm } = mockCalm(() =>
        CalmApiError.fromOData(400, { code: 'BAD', message: 'no' }),
      );
      await expect(
        createProjectTool.handler({ calm }, { name: 'N' }),
      ).rejects.toMatchObject({ code: 'ODATA_ERROR', serviceCode: 'BAD' });
    });
  });
});
