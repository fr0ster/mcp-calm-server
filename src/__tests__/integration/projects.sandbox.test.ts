import { getProjectTool } from '../../tools/projects/getProject';
import { listProjectsTool } from '../../tools/projects/listProjects';
import { ctx, describeSandbox } from './_sandbox';

describeSandbox('projects tools (sandbox)', () => {
  describe('calm_projects_list', () => {
    it('returns a list (possibly empty in shared sandbox)', async () => {
      const res = await listProjectsTool.handler(ctx(), { limit: 3 });
      expect(Array.isArray(res.items)).toBe(true);
    });
  });

  describe('calm_projects_get', () => {
    it('can fetch a project by id when the list is non-empty', async () => {
      const list = await listProjectsTool.handler(ctx(), { limit: 1 });
      if (list.items.length === 0) {
        // Shared sandbox has 0 projects for most S-users; chained read is
        // structurally testable, just not executable here. Skip cleanly.
        return;
      }
      const id = (list.items[0] as { id?: string }).id;
      if (!id) return;
      const res = await getProjectTool.handler(ctx(), { id });
      expect(res).toHaveProperty('id', id);
    });
  });
});
