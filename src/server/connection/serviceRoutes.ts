import type { CalmService } from '@mcp-abap-adt/interfaces';

export type CalmServiceRouteMap = Record<CalmService, string>;

/**
 * Cloud ALM service route suffixes appended to `baseUrl` verbatim.
 *
 * Full URL = `joinUrl(baseUrl, serviceRoute)`. `baseUrl` already
 * includes any tenant mount prefix (for OAuth2 tenants that is the
 * `/api` that SAP puts in `endpoints.Api`; for sandbox it is the
 * `/SAPCALM` suffix). The connection layer does NOT inject a prefix.
 *
 * Seeded from `sap-cloud-alm-odata-mcp/src/config.rs`; verify against
 * a live tenant. Override per-connection via the `serviceRoutes` ctor
 * option.
 */
export const DEFAULT_CALM_SERVICE_ROUTES: CalmServiceRouteMap = {
  features: '/calm-features/v1',
  documents: '/calm-documents/v1',
  tasks: '/calm-tasks/v1',
  projects: '/calm-projects/v1',
  testManagement: '/calm-testmanagement/v1',
  hierarchy: '/calm-processhierarchy/v1',
  analytics: '/calm-analytics/v1/odata/v4/analytics',
  processMonitoring: '/calm-processmonitoring/v1',
  logs: '/calm-logs/v1',
};
