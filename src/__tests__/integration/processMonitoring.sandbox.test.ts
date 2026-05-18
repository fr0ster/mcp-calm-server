import { listBusinessProcessesTool } from '../../tools/processMonitoring/listBusinessProcesses';
import { ctx, describeSandbox } from './_sandbox';

describeSandbox('processMonitoring tools (sandbox)', () => {
  // Sandbox does NOT expose the Business Processes endpoint — the
  // server returns 404 (documented in the M5 sandbox writeup). When SAP
  // adds it to the sandbox catalog this test will start failing, which
  // is the signal to flip it to a real assertion.
  it.failing('list_processes is unavailable in sandbox (currently 404)', async () => {
    const res = await listBusinessProcessesTool.handler(await ctx(), {
      limit: 1,
    });
    expect(Array.isArray(res.rows)).toBe(true);
  });
});
