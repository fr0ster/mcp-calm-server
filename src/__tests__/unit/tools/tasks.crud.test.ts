import { CalmApiError } from '@mcp-abap-adt/calm-client';
import { createTaskTool } from '../../../tools/tasks/createTask';
import { createTaskCommentTool } from '../../../tools/tasks/createTaskComment';
import { deleteTaskTool } from '../../../tools/tasks/deleteTask';
import { updateTaskTool } from '../../../tools/tasks/updateTask';
import { mockCalm } from '../../helpers/mockCalm';

describe('task CRUD tools', () => {
  describe('calm_tasks_create', () => {
    test('rejects when projectId missing', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        createTaskTool.handler({ calm }, {
          title: 'T',
          type: 'requirement',
        } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('rejects when title missing', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        createTaskTool.handler({ calm }, {
          projectId: 'P',
          type: 'requirement',
        } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('rejects when type missing', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        createTaskTool.handler({ calm }, {
          projectId: 'P',
          title: 'T',
        } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('forwards full payload to calm.tasks.create', async () => {
      const { calm, calls } = mockCalm(() => ({ id: 't1', title: 'T' }));
      const result = await createTaskTool.handler(
        { calm },
        {
          projectId: 'P',
          title: 'T',
          type: 'requirement',
          description: 'd',
          priorityId: 20,
        },
      );
      expect(calls[0]).toMatchObject({
        service: 'tasks',
        method: 'create',
        args: [
          {
            projectId: 'P',
            title: 'T',
            type: 'requirement',
            description: 'd',
            priorityId: 20,
          },
        ],
      });
      expect(result.id).toBe('t1');
    });

    test('ODATA_ERROR carries serviceCode', async () => {
      const { calm } = mockCalm(() =>
        CalmApiError.fromOData(400, { code: 'BAD', message: 'no' }),
      );
      await expect(
        createTaskTool.handler(
          { calm },
          { projectId: 'P', title: 'T', type: 'requirement' },
        ),
      ).rejects.toMatchObject({ code: 'ODATA_ERROR', serviceCode: 'BAD' });
    });
  });

  describe('calm_tasks_update', () => {
    test('rejects missing id', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        updateTaskTool.handler({ calm }, { title: 'x' } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('separates id from patch payload', async () => {
      const { calm, calls } = mockCalm(() => ({ id: 't1' }));
      await updateTaskTool.handler(
        { calm },
        { id: 't1', status: 'DONE', title: 'renamed' },
      );
      expect(calls[0]).toMatchObject({
        service: 'tasks',
        method: 'update',
        args: ['t1', { status: 'DONE', title: 'renamed' }],
      });
    });

    test('NOT_FOUND surfaces', async () => {
      const { calm } = mockCalm(() => CalmApiError.fromNotFound('Task', 't1'));
      await expect(
        updateTaskTool.handler({ calm }, { id: 't1', title: 'x' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('calm_tasks_delete', () => {
    test('rejects missing id', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        deleteTaskTool.handler({ calm }, {} as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('returns confirmation on success', async () => {
      const { calm, calls } = mockCalm(() => undefined);
      const result = await deleteTaskTool.handler({ calm }, { id: 't1' });
      expect(calls[0]).toMatchObject({
        service: 'tasks',
        method: 'delete',
        args: ['t1'],
      });
      expect(result).toEqual({ deleted: true, id: 't1' });
    });

    test('NOT_FOUND surfaces', async () => {
      const { calm } = mockCalm(() => CalmApiError.fromNotFound('Task', 't1'));
      await expect(
        deleteTaskTool.handler({ calm }, { id: 't1' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('calm_tasks_create_comment', () => {
    test('rejects missing taskId', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        createTaskCommentTool.handler({ calm }, { content: 'hi' } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('rejects missing content', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        createTaskCommentTool.handler({ calm }, { taskId: 't1' } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('forwards taskId and payload to calm.tasks.createComment', async () => {
      const { calm, calls } = mockCalm(() => ({ id: 'c1', content: 'hi' }));
      const result = await createTaskCommentTool.handler(
        { calm },
        { taskId: 't1', content: 'hi' },
      );
      expect(calls[0]).toMatchObject({
        service: 'tasks',
        method: 'createComment',
        args: ['t1', { content: 'hi' }],
      });
      expect(result).toMatchObject({ id: 'c1' });
    });
  });
});
