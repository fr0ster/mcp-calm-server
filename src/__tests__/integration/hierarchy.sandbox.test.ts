import { createHierarchyNodeTool } from '../../tools/hierarchy/createHierarchyNode';
import { deleteHierarchyNodeTool } from '../../tools/hierarchy/deleteHierarchyNode';
import { getHierarchyWithChildrenTool } from '../../tools/hierarchy/getHierarchyWithChildren';
import { listHierarchyTool } from '../../tools/hierarchy/listHierarchy';
import { updateHierarchyNodeTool } from '../../tools/hierarchy/updateHierarchyNode';
import { ctx, describeSandbox } from './_sandbox';

describeSandbox('hierarchy tools (sandbox)', () => {
  it('lists hierarchy nodes', async () => {
    const res = await listHierarchyTool.handler(await ctx(), { limit: 1 });
    expect(Array.isArray(res.items)).toBe(true);
  });

  it('getWithChildren rejects missing uuid', async () => {
    await expect(
      getHierarchyWithChildrenTool.handler(await ctx(), {} as never),
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  // CRUD mutations (create/update/delete) intentionally NOT exercised
  // against the shared sandbox. Reachability is checked via the
  // INVALID_ARGUMENT guards, which fire before any network call.
  describe('CRUD argument validation (no network)', () => {
    it('create_node rejects missing title', async () => {
      await expect(
        createHierarchyNodeTool.handler(await ctx(), {} as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    it('update_node rejects missing uuid', async () => {
      await expect(
        updateHierarchyNodeTool.handler(await ctx(), { title: 'x' } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    it('delete_node rejects missing uuid', async () => {
      await expect(
        deleteHierarchyNodeTool.handler(await ctx(), {} as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });
  });
});
