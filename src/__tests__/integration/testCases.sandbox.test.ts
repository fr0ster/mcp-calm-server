import { createTestActionTool } from '../../tools/testCases/createTestAction';
import { createTestActivityTool } from '../../tools/testCases/createTestActivity';
import { createTestCaseTool } from '../../tools/testCases/createTestCase';
import { deleteTestCaseTool } from '../../tools/testCases/deleteTestCase';
import { getTestCaseTool } from '../../tools/testCases/getTestCase';
import { listTestCasesTool } from '../../tools/testCases/listTestCases';
import { updateTestCaseTool } from '../../tools/testCases/updateTestCase';
import { ctx, describeSandbox } from './_sandbox';

describeSandbox('testCases tools (sandbox)', () => {
  it('lists test cases', async () => {
    const res = await listTestCasesTool.handler(await ctx(), { limit: 1 });
    expect(Array.isArray(res.items)).toBe(true);
  });

  it('rejects get without uuid', async () => {
    await expect(
      getTestCaseTool.handler(await ctx(), {} as never),
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  // CRUD mutations (create/update/delete + create_activity + create_action)
  // intentionally NOT exercised against the shared sandbox. The
  // INVALID_ARGUMENT path is verified here as a low-cost reachability
  // check — the tool is wired in and the runtime guard fires before any
  // network call, regardless of sandbox data state.
  describe('CRUD argument validation (no network)', () => {
    it('create rejects missing title', async () => {
      await expect(
        createTestCaseTool.handler(await ctx(), {} as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    it('update rejects missing uuid', async () => {
      await expect(
        updateTestCaseTool.handler(await ctx(), { title: 'x' } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    it('delete rejects missing uuid', async () => {
      await expect(
        deleteTestCaseTool.handler(await ctx(), {} as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    it('create_activity rejects missing parent_ID', async () => {
      await expect(
        createTestActivityTool.handler(await ctx(), { title: 'A' } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    it('create_action rejects missing parent_ID', async () => {
      await expect(
        createTestActionTool.handler(await ctx(), { title: 'A' } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });
  });
});
