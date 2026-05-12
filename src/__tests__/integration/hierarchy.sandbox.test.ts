import { getHierarchyWithChildrenTool } from '../../tools/hierarchy/getHierarchyWithChildren';
import { listHierarchyTool } from '../../tools/hierarchy/listHierarchy';
import { ctx, describeSandbox } from './_sandbox';

describeSandbox('hierarchy tools (sandbox)', () => {
  it('lists hierarchy nodes', async () => {
    const res = await listHierarchyTool.handler(ctx(), { limit: 1 });
    expect(Array.isArray(res.items)).toBe(true);
  });

  it('getWithChildren rejects missing uuid', async () => {
    await expect(
      getHierarchyWithChildrenTool.handler(ctx(), {} as never),
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });
});
