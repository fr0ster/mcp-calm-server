import type {
  IAnalyticsProviderInfo,
  IListProvidersResult,
} from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';

export type { IAnalyticsProviderInfo };

const definition: ICalmToolDefinition = {
  name: 'calm_analytics_list_providers',
  description:
    'List the 17 Cloud ALM analytics dataset names available to `calm_analytics_query`. Pure client-side call — does not hit the network. Use this as discovery before forming analytics queries.',
  inputSchema: { type: 'object', properties: {} },
};

const handler: CalmToolHandler<unknown, IListProvidersResult> = async (ctx) => {
  return ctx.calm.getAnalytics().listProviders();
};

export const listAnalyticsProvidersTool: ICalmHandlerEntry<
  unknown,
  IListProvidersResult
> = {
  toolDefinition: definition,
  handler,
};
