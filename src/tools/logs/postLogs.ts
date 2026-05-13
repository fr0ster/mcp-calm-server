import type { IPostLogsParams } from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export interface IPostLogsArgs extends IPostLogsParams {
  records: unknown;
}

export interface IPostLogsResult {
  result: unknown;
}

const definition: ICalmToolDefinition = {
  name: 'calm_logs_post',
  description:
    "Post inbound log records to Cloud ALM Logs (OpenTelemetry-style). Destructive. Requires `useCase` and `serviceId` (routing keys) plus a `records` payload (caller-defined shape — the Logs API does not enforce a schema). Returns the server's response wrapped under `result`.",
  inputSchema: {
    type: 'object',
    required: ['useCase', 'serviceId', 'records'],
    properties: {
      useCase: {
        type: 'string',
        description: 'Routing key — Cloud ALM use-case identifier.',
      },
      serviceId: {
        type: 'string',
        description: 'Routing key — id of the emitting service.',
      },
      version: { type: 'string', description: 'Optional schema version.' },
      dev: {
        type: 'boolean',
        description:
          'Optional dev-mode flag (passed through as a query param).',
      },
      tag: { type: 'string', description: 'Optional free-form tag.' },
      records: {
        description:
          'Log payload. Shape is caller-defined; pass an array, an object, or whatever the receiving use-case expects.',
      },
    },
  },
};

const handler: CalmToolHandler<IPostLogsArgs, IPostLogsResult> = async (
  ctx,
  args,
) => {
  if (!args?.useCase || !args?.serviceId) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'useCase and serviceId are required',
    });
  }
  if (args.records === undefined) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'records is required',
    });
  }
  const { records, ...params } = args;
  try {
    const result = await ctx.calm.getLogs().post(params, records);
    return { result };
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const postLogsTool: ICalmHandlerEntry<IPostLogsArgs, IPostLogsResult> = {
  toolDefinition: definition,
  handler,
};
