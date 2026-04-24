import { HandlerGroup } from '../../registry/HandlerGroup';
import type { ICalmHandlerEntry } from '../../registry/types';
import { listAnalyticsProvidersTool } from './listAnalyticsProviders';
import { queryAnalyticsTool } from './queryAnalytics';

export { listAnalyticsProvidersTool } from './listAnalyticsProviders';
export type {
  IQueryAnalyticsArgs,
  IQueryAnalyticsResult,
} from './queryAnalytics';
export { queryAnalyticsTool } from './queryAnalytics';

export const ANALYTICS_HANDLERS: readonly ICalmHandlerEntry[] = [
  queryAnalyticsTool,
  listAnalyticsProvidersTool,
];

export const ANALYTICS_GROUP = new HandlerGroup(
  'analytics',
  ANALYTICS_HANDLERS,
);
