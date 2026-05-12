import { getTestCaseTool } from '../../tools/testCases/getTestCase';
import { listTestCasesTool } from '../../tools/testCases/listTestCases';
import { ctx, describeSandbox } from './_sandbox';

describeSandbox('testCases tools (sandbox)', () => {
  // Known tool bug as of 2026-05: listTestCases emits $filter on a
  // property `statusCode` that ManualTestCases doesn't expose, so the
  // server returns OData 400. Documented here with `it.failing` so the
  // test flips green automatically once the filter is fixed in the
  // testCases tool implementation.
  it.failing('list returns testcases (currently fails with ODATA 400 on statusCode)', async () => {
    const res = await listTestCasesTool.handler(ctx(), { limit: 1 });
    expect(Array.isArray(res.items)).toBe(true);
  });

  it('rejects get without uuid', async () => {
    await expect(
      getTestCaseTool.handler(ctx(), {} as never),
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });
});
