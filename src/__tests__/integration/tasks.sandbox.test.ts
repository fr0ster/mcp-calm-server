import { getTaskTool } from '../../tools/tasks/getTask';
import { listTaskCommentsTool } from '../../tools/tasks/listTaskComments';
import { listTasksTool } from '../../tools/tasks/listTasks';
import {
  ctx,
  describeSandbox,
  describeWithProject,
  PROJECT_ID,
} from './_sandbox';

describeSandbox('tasks tools (sandbox)', () => {
  // CRUD mutations (create/update/delete/create_comment) intentionally
  // NOT exercised against the shared sandbox.

  describeWithProject('project-scoped reads (needs CALM_PROJECT_ID)', () => {
    it('lists tasks for the configured project', async () => {
      const res = await listTasksTool.handler(await ctx(), {
        projectId: PROJECT_ID as string,
        limit: 3,
      });
      expect(Array.isArray(res.items)).toBe(true);
    });

    it('chains list → get + listComments when the project has tasks', async () => {
      const list = await listTasksTool.handler(await ctx(), {
        projectId: PROJECT_ID as string,
        limit: 1,
      });
      if (list.items.length === 0) return;
      const id = (list.items[0] as { id?: string }).id;
      if (!id) return;
      const task = await getTaskTool.handler(await ctx(), { id });
      expect(task).toHaveProperty('id', id);
      const comments = await listTaskCommentsTool.handler(await ctx(), {
        taskId: id,
        limit: 3,
      });
      expect(Array.isArray(comments.items)).toBe(true);
    });
  });
});
