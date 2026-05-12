import { CalmApiError } from '@mcp-abap-adt/calm-client';
import { createTestActionTool } from '../../../tools/testCases/createTestAction';
import { createTestActivityTool } from '../../../tools/testCases/createTestActivity';
import { createTestCaseTool } from '../../../tools/testCases/createTestCase';
import { deleteTestCaseTool } from '../../../tools/testCases/deleteTestCase';
import { updateTestCaseTool } from '../../../tools/testCases/updateTestCase';
import { mockCalm } from '../../helpers/mockCalm';

describe('test case CRUD tools', () => {
  describe('calm_test_cases_create', () => {
    test('rejects when title missing', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        createTestCaseTool.handler({ calm }, {} as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('forwards payload to calm.testCases.create', async () => {
      const { calm, calls } = mockCalm(() => ({ uuid: 'tc1', title: 'T' }));
      const result = await createTestCaseTool.handler(
        { calm },
        { title: 'T', description: 'd', projectId: 'P' },
      );
      expect(calls[0]).toMatchObject({
        service: 'testCases',
        method: 'create',
        args: [{ title: 'T', description: 'd', projectId: 'P' }],
      });
      expect(result.uuid).toBe('tc1');
    });

    test('ODATA_ERROR carries serviceCode', async () => {
      const { calm } = mockCalm(() =>
        CalmApiError.fromOData(400, { code: 'BAD', message: 'no' }),
      );
      await expect(
        createTestCaseTool.handler({ calm }, { title: 'T' }),
      ).rejects.toMatchObject({ code: 'ODATA_ERROR', serviceCode: 'BAD' });
    });
  });

  describe('calm_test_cases_update', () => {
    test('rejects missing uuid', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        updateTestCaseTool.handler({ calm }, { title: 'x' } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('separates uuid from patch payload', async () => {
      const { calm, calls } = mockCalm(() => ({ uuid: 'tc1' }));
      await updateTestCaseTool.handler(
        { calm },
        { uuid: 'tc1', statusCode: 'DONE', title: 'renamed' },
      );
      expect(calls[0]).toMatchObject({
        service: 'testCases',
        method: 'update',
        args: ['tc1', { statusCode: 'DONE', title: 'renamed' }],
      });
    });

    test('NOT_FOUND surfaces', async () => {
      const { calm } = mockCalm(() =>
        CalmApiError.fromNotFound('TestCase', 'tc1'),
      );
      await expect(
        updateTestCaseTool.handler({ calm }, { uuid: 'tc1', title: 'x' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('calm_test_cases_delete', () => {
    test('rejects missing uuid', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        deleteTestCaseTool.handler({ calm }, {} as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('returns confirmation on success', async () => {
      const { calm, calls } = mockCalm(() => undefined);
      const result = await deleteTestCaseTool.handler(
        { calm },
        { uuid: 'tc1' },
      );
      expect(calls[0]).toMatchObject({
        service: 'testCases',
        method: 'delete',
        args: ['tc1'],
      });
      expect(result).toEqual({ deleted: true, uuid: 'tc1' });
    });

    test('NOT_FOUND surfaces', async () => {
      const { calm } = mockCalm(() =>
        CalmApiError.fromNotFound('TestCase', 'tc1'),
      );
      await expect(
        deleteTestCaseTool.handler({ calm }, { uuid: 'tc1' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('calm_test_cases_create_activity', () => {
    test('rejects missing title', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        createTestActivityTool.handler({ calm }, { parent_ID: 'tc1' } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('rejects missing parent_ID', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        createTestActivityTool.handler({ calm }, { title: 'A' } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('forwards payload to calm.testCases.createActivity', async () => {
      const { calm, calls } = mockCalm(() => ({ uuid: 'act1', title: 'A' }));
      const result = await createTestActivityTool.handler(
        { calm },
        { title: 'A', parent_ID: 'tc1', sequence: 1 },
      );
      expect(calls[0]).toMatchObject({
        service: 'testCases',
        method: 'createActivity',
        args: [{ title: 'A', parent_ID: 'tc1', sequence: 1 }],
      });
      expect(result.uuid).toBe('act1');
    });
  });

  describe('calm_test_cases_create_action', () => {
    test('rejects missing title', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        createTestActionTool.handler({ calm }, { parent_ID: 'a' } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('rejects missing parent_ID', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        createTestActionTool.handler({ calm }, { title: 'A' } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('forwards full payload to calm.testCases.createAction', async () => {
      const { calm, calls } = mockCalm(() => ({ uuid: 'ac1', title: 'A' }));
      await createTestActionTool.handler(
        { calm },
        {
          title: 'A',
          parent_ID: 'act1',
          expectedResult: 'pass',
          isEvidenceRequired: true,
        },
      );
      expect(calls[0]).toMatchObject({
        service: 'testCases',
        method: 'createAction',
        args: [
          {
            title: 'A',
            parent_ID: 'act1',
            expectedResult: 'pass',
            isEvidenceRequired: true,
          },
        ],
      });
    });
  });
});
