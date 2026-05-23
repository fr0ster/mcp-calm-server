import { readConfig } from '../../server/config';
import { createCalmConnection } from '../../server/connection/createCalmConnection';
import { listBusinessProcessesTool } from '../../tools/processMonitoring/listBusinessProcesses';
import { CalmToolError } from '../../utils/errorMapping';
import { ctx, describeOAuth2 } from './_sandbox';

describeOAuth2('processMonitoring tools (live OAuth2 tenant)', () => {
  it('forms the processMonitoring URL exactly once with /api', async () => {
    const conn = createCalmConnection(readConfig());
    const url = await conn.getServiceUrl('processMonitoring');
    // Exactly one /api, correct service route, no doubling.
    expect(url).toMatch(/^https:\/\/[^/]+\/api\/calm-processmonitoring\/v1$/);
    expect(url).not.toContain('/api/api/');
  });

  it('reaches the tenant; succeeds or is scope/deploy-gated (403|404)', async () => {
    try {
      const res = await listBusinessProcessesTool.handler(await ctx(), {
        limit: 1,
      });
      expect(Array.isArray(res.rows)).toBe(true);
    } catch (err) {
      // Correct URL, but tenant withholds scope (403) or module not
      // deployed (404). The tool re-maps CalmApiError -> CalmToolError.
      // Both statuses acceptable; anything else is a regression.
      expect(err).toBeInstanceOf(CalmToolError);
      expect([403, 404]).toContain((err as CalmToolError).status);
    }
  });
});
