import { ODataQuery } from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import {
  clampListLimit,
  MAX_LIST_LIMIT,
  mapCalmErrorForTool,
} from '../../utils';

export interface IListBusinessProcessesArgs {
  limit?: number;
  offset?: number;
}

export interface IListBusinessProcessesResult {
  rows: unknown[];
}

const definition: ICalmToolDefinition = {
  name: 'calm_process_monitoring_list_processes',
  description:
    'List monitored business processes (read-only). Response shape depends on the tenant configuration; `rows` holds the raw records.',
  inputSchema: {
    type: 'object',
    properties: {
      limit: { type: 'integer', minimum: 1, maximum: MAX_LIST_LIMIT },
      offset: { type: 'integer', minimum: 0 },
    },
  },
};

const handler: CalmToolHandler<
  IListBusinessProcessesArgs,
  IListBusinessProcessesResult
> = async (ctx, args) => {
  const limit = clampListLimit(args?.limit);
  const offset = args?.offset && args.offset > 0 ? Math.floor(args.offset) : 0;
  const query = ODataQuery.new().top(limit).skip(offset);
  try {
    const raw = await ctx.calm
      .getProcessMonitoring()
      .listBusinessProcesses<{ value?: unknown[] } | unknown[]>(query);
    const rows = Array.isArray(raw) ? raw : (raw?.value ?? []);
    return { rows };
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const listBusinessProcessesTool: ICalmHandlerEntry<
  IListBusinessProcessesArgs,
  IListBusinessProcessesResult
> = {
  toolDefinition: definition,
  handler,
};
