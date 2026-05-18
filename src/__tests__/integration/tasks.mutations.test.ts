import { createTaskTool } from '../../tools/tasks/createTask';
import { createTaskCommentTool } from '../../tools/tasks/createTaskComment';
import { deleteTaskTool } from '../../tools/tasks/deleteTask';
import { getTaskTool } from '../../tools/tasks/getTask';
import { updateTaskTool } from '../../tools/tasks/updateTask';
import { ctx, describeMutating, PROJECT_ID } from './_sandbox';

// Gate: CALM_MODE=sandbox|oauth2 + CALM_API_KEY-or-UAA + CALM_PROJECT_ID +
// CALM_ALLOW_MUTATIONS=1. Tasks created here are deleted in the same
// run, so a green pass leaves no residue. The mutating gate is opt-in
// by design — the shared SAP sandbox is read-friendly only.
describeMutating('tasks mutation lifecycle (live, opt-in)', () => {
  it('round-trips create → get → update → comment → delete', async () => {
    const projectId = PROJECT_ID as string;
    const stamp = new Date().toISOString();

    // CREATE
    const created = await createTaskTool.handler(await ctx(), {
      projectId,
      title: `mcp-calm-server integration test ${stamp}`,
      type: 'requirement',
      description: 'Created by automated integration suite — safe to delete.',
    });
    expect(created.id).toBeTruthy();
    const id = created.id as string;

    try {
      // GET
      const fetched = await getTaskTool.handler(await ctx(), { id });
      expect(fetched.id).toBe(id);

      // UPDATE
      const updated = await updateTaskTool.handler(await ctx(), {
        id,
        title: `${fetched.title} (renamed)`,
      });
      expect(updated.title).toMatch(/\(renamed\)$/);

      // COMMENT
      const comment = await createTaskCommentTool.handler(await ctx(), {
        taskId: id,
        content: 'Automated comment from integration test',
      });
      expect(comment).toBeDefined();
    } finally {
      // DELETE (always — keeps the tenant clean even on assert failure)
      const res = await deleteTaskTool.handler(await ctx(), { id });
      expect(res).toEqual({ deleted: true, id });
    }
  });
});
