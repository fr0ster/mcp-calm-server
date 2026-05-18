import { createProjectTool } from '../../tools/projects/createProject';
import { getProjectTool } from '../../tools/projects/getProject';
import { listProjectsTool } from '../../tools/projects/listProjects';
import type { IListResponse } from '../../utils';
import { ctx, describeSandbox } from './_sandbox';

describeSandbox('projects tools (sandbox)', () => {
  // listProjects against the public sandbox is slow (25-28s typical);
  // share the result across the two assertions instead of calling twice.
  let list: IListResponse<Record<string, unknown>>;

  beforeAll(async () => {
    list = (await listProjectsTool.handler(await ctx(), {
      limit: 1,
    })) as IListResponse<Record<string, unknown>>;
  });

  it('list returns an items array (possibly empty in shared sandbox)', () => {
    expect(Array.isArray(list.items)).toBe(true);
  });

  it('chains list → get when the list is non-empty', async () => {
    if (list.items.length === 0) return;
    const id = (list.items[0] as { id?: string }).id;
    if (!id) return;
    const res = await getProjectTool.handler(await ctx(), { id });
    expect(res).toHaveProperty('id', id);
  });

  // create intentionally NOT exercised against the shared sandbox — a
  // project is a heavy entity that would persist visibly to every other
  // sandbox tenant.
  it('create rejects missing name', async () => {
    await expect(
      createProjectTool.handler(await ctx(), {} as never),
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });
});
