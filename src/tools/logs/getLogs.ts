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
          'Optional service id filter (emitted as `logsFilters[serviceId]`).',
      },
      from: { type: 'string', description: 'ISO timestamp, inclusive start.' },
      to: { type: 'string', description: 'ISO timestamp, exclusive end.' },
      period: {
        type: 'string',
        description:
          'Period shorthand (e.g. "1h", "24h"). Alternative to from/to.',
      },
      limit: { type: 'integer', minimum: 1, maximum: 1000 },
      offset: { type: 'integer', minimum: 0 },
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
