import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export interface IGetLogsArgs {
  provider: string;
  serviceId?: string;
  from?: string;
  to?: string;
  period?: string;
  limit?: number;
  offset?: number;
  onLimit?: string;
}

export interface IGetLogsResult {
  records: unknown;
}

const definition: ICalmToolDefinition = {
  name: 'calm_logs_get',
  description:
    'Fetch application logs from Cloud ALM Logs (OpenTelemetry-style). Unlike other Cloud ALM services, Logs uses a domain-specific REST query (not OData). `provider` is required; filter by `serviceId`, or a time window via `from`/`to` (ISO timestamps) or `period`. Returns the raw `records` payload.',
  inputSchema: {
    type: 'object',
    required: ['provider'],
    properties: {
      provider: { type: 'string', description: 'Log provider name.' },
      serviceId: {
        type: 'string',
        description:
          'Service id filter, emitted as a plain `serviceId` query param. The live Logs API requires it alongside `provider` and rejects a request without it (HTTP 428).',
      },
      from: { type: 'string', description: 'ISO timestamp, inclusive start.' },
      to: { type: 'string', description: 'ISO timestamp, exclusive end.' },
      period: {
        type: 'string',
        description:
          'Period shorthand in the Logs API format `<n>M` minutes (e.g. "10M" = last 10 minutes), NOT "1h"/"24h". Alternative to from/to. Wide windows can exceed the server count cap (HTTP 403) — narrow the period.',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 1000,
        description:
          'Max records to return. The Logs API only honours this together with the count-cap strategy — the client auto-sets `onLimit="truncate"` when `limit` is given, so paging works out of the box.',
      },
      offset: { type: 'integer', minimum: 0 },
      onLimit: {
        type: 'string',
        description:
          'Server-side count-cap strategy. Defaults to "truncate" when `limit`/`offset` is set (the only value that returns data on a window over the cap; otherwise the API responds HTTP 403). Override only if you know another value the tenant accepts.',
      },
    },
  },
};

const handler: CalmToolHandler<IGetLogsArgs, IGetLogsResult> = async (
  ctx,
  args,
) => {
  if (!args?.provider) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'provider is required',
    });
  }
  try {
    const records = await ctx.calm.getLogs().get({
      provider: args.provider,
      serviceId: args.serviceId,
      from: args.from,
      to: args.to,
      period: args.period,
      limit: args.limit,
      offset: args.offset,
      onLimit: args.onLimit,
    });
    return { records };
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const getLogsTool: ICalmHandlerEntry<IGetLogsArgs, IGetLogsResult> = {
  toolDefinition: definition,
  handler,
};
