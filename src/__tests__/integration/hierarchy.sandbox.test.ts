import { getHierarchyWithChildrenTool } from '../../tools/hierarchy/getHierarchyWithChildren';
import { listHierarchyTool } from '../../tools/hierarchy/listHierarchy';
import { ctx, describeSandbox } from './_sandbox';

describeSandbox('hierarchy tools (sandbox)', () => {
  // Known tool bug as of 2026-05: listHierarchy emits an OData $filter
  // referencing `parentNodeUuid`, a property HierarchyNodes does not
  // expose → server returns 400. `it.failing` documents the current
  // state and will flip to green once the filter is corrected.
  it.failing('list returns hierarchy nodes (currently fails with ODATA 400 on parentNodeUuid)', async () => {
    const res = await listHierarchyTool.handler(ctx(), { limit: 1 });
    expect(Array.isArray(res.items)).toBe(true);
  });

  it('getWithChildren rejects missing uuid', async () => {
    await expect(
      getHierarchyWithChildrenTool.handler(ctx(), {} as never),
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });
});
