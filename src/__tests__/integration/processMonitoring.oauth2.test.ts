import { listBusinessProcessesTool } from '../../tools/processMonitoring/listBusinessProcesses';
import { ctx, describeOAuth2 } from './_sandbox';

describeOAuth2('processMonitoring tools (live OAuth2 tenant)', () => {
  // SAP's sandbox returns 404 for the Business Processes endpoint
  // (covered by an `it.failing` guard in the sibling sandbox file).
  // A real Cloud ALM tenant exposes it — this is where coverage lives.
  it('list_processes returns rows[]', async () => {
    const res = await listBusinessProcessesTool.handler(await ctx(), {
      limit: 1,
    });
    expect(Array.isArray(res.rows)).toBe(true);
  });
});
