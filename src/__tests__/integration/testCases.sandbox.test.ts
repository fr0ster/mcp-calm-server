import { getTestCaseTool } from '../../tools/testCases/getTestCase';
import { listTestCasesTool } from '../../tools/testCases/listTestCases';
import { ctx, describeSandbox } from './_sandbox';

describeSandbox('testCases tools (sandbox)', () => {
  it('lists test cases', async () => {
    const res = await listTestCasesTool.handler(ctx(), { limit: 1 });
    expect(Array.isArray(res.items)).toBe(true);
  });

  it('rejects get without uuid', async () => {
    await expect(
      getTestCaseTool.handler(ctx(), {} as never),
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });
});
