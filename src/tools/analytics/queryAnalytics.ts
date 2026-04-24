import {
  ANALYTICS_ENDPOINTS,
  type AnalyticsEndpoint,
  ODataQuery,
} from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import {
  CalmToolError,
  clampListLimit,
  MAX_LIST_LIMIT,
  mapCalmErrorForTool,
} from '../../utils';

export interface IQueryAnalyticsArgs {
  endpoint: AnalyticsEndpoint;
  filter?: string;
  select?: string[];
  limit?: number;
  offset?: number;
}

export interface IQueryAnalyticsResult {
  endpoint: AnalyticsEndpoint;
  rows: unknown[];
}

const definition: ICalmToolDefinition = {
  name: 'calm_analytics_query',
  description:
    'Query a pre-aggregated Cloud ALM analytics dataset (read-only). Endpoint names come from `calm_analytics_list_providers`. Optional `filter` is a raw OData filter string (advanced users only — prefer per-dataset named args when added). `rows` contains the raw JSON from the server; schema varies per endpoint.',
  inputSchema: {
    type: 'object',
    required: ['endpoint'],
    properties: {
      endpoint: {
        type: 'string',
        description: 'One of the Cloud ALM analytics endpoint names.',
        enum: [...ANALYTICS_ENDPOINTS],
      },
      filter: {
        type: 'string',
        description:
          'Raw OData $filter expression, e.g. "statusCode eq \'OPEN\'". Used as-is; caller is responsible for escaping.',
      },
      select: {
        type: 'array',
        description: 'Subset of dataset columns to return ($select).',
        items: { type: 'string' },
      },
      limit: { type: 'integer', minimum: 1, maximum: MAX_LIST_LIMIT },
      offset: { type: 'integer', minimum: 0 },
    },
  },
};

const handler: CalmToolHandler<
  IQueryAnalyticsArgs,
  IQueryAnalyticsResult
> = async (ctx, args) => {
  if (!args?.endpoint) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'endpoint is required',
    });
  }
  const limit = clampListLimit(args.limit);
  const offset = args.offset && args.offset > 0 ? Math.floor(args.offset) : 0;
  let query = ODataQuery.new().top(limit).skip(offset);
  if (args.filter) query = query.filter(args.filter);
  if (args.select && args.select.length > 0) query = query.select(args.select);

  try {
    const raw = await ctx.calm
      .getAnalytics()
      .getEndpoint<{ value?: unknown[] } | unknown[]>(args.endpoint, query);
    const rows = Array.isArray(raw) ? raw : (raw?.value ?? []);
    return { endpoint: args.endpoint, rows };
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const queryAnalyticsTool: ICalmHandlerEntry<
  IQueryAnalyticsArgs,
  IQueryAnalyticsResult
> = {
  toolDefinition: definition,
  handler,
};
