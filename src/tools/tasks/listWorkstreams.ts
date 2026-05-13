import { type IWorkstream, ODataQuery } from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import {
  clampListLimit,
  escapeODataString,
  type IListResponse,
  joinAndFilters,
  MAX_LIST_LIMIT,
  mapCalmErrorForTool,
  toListResponse,
} from '../../utils';

export interface IListWorkstreamsArgs {
  projectId?: string;
  limit?: number;
  offset?: number;
  withCount?: boolean;
}

const definition: ICalmToolDefinition = {
  name: 'calm_tasks_list_workstreams',
  description:
    'List Cloud ALM workstreams (the workstream taxonomy tasks can be grouped under). Optionally scope to a project via `projectId`.',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Optional project scope.' },
      limit: { type: 'integer', minimum: 1, maximum: MAX_LIST_LIMIT },
      offset: { type: 'integer', minimum: 0 },
      withCount: { type: 'boolean' },
    },
  },
};

const handler: CalmToolHandler<
  IListWorkstreamsArgs,
  IListResponse<IWorkstream>
> = async (ctx, args) => {
  const limit = clampListLimit(args?.limit);
  const offset = args?.offset && args.offset > 0 ? Math.floor(args.offset) : 0;
  const filter = joinAndFilters(
    args?.projectId
      ? `projectId eq '${escapeODataString(args.projectId)}'`
      : undefined,
  );
  let query = ODataQuery.new().top(limit).skip(offset);
  if (filter) query = query.filter(filter);
  if (args?.withCount) query = query.count();
  try {
    const collection = await ctx.calm.getTasks().listWorkstreams(query);
    return toListResponse(collection, { limit, offset });
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const listWorkstreamsTool: ICalmHandlerEntry<
  IListWorkstreamsArgs,
  IListResponse<IWorkstream>
> = {
  toolDefinition: definition,
  handler,
};
