import { listAnalyticsProvidersTool } from '../../tools/analytics/listAnalyticsProviders';
import { queryAnalyticsTool } from '../../tools/analytics/queryAnalytics';
import { ctx, describeSandbox } from './_sandbox';

describeSandbox('analytics tools (sandbox)', () => {
  describe('calm_analytics_list_providers', () => {
    it('returns the public analytics catalog', async () => {
      const res = await listAnalyticsProvidersTool.handler(await ctx(), {});
      expect(Array.isArray(res.providers)).toBe(true);
      expect(res.providers.length).toBeGreaterThan(0);
      const names = res.providers.map((p) => p.name);
      expect(names).toEqual(expect.arrayContaining(['Projects', 'Tasks']));
    });
  });

  describe('calm_analytics_query', () => {
    it('returns rows[] for the Projects endpoint', async () => {
      const res = await queryAnalyticsTool.handler(await ctx(), {
        endpoint: 'Projects',
        limit: 5,
      });
      expect(res.endpoint).toBe('Projects');
      expect(Array.isArray(res.rows)).toBe(true);
    });
  });
});
