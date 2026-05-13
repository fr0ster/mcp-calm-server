import { type IWorkstream, ODataQuery } from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import {
  CalmToolError,
  clampListLimit,
  type IListResponse,
  MAX_LIST_LIMIT,
  mapCalmErrorForTool,
  toListResponse,
} from '../../utils';

export interface IListWorkstreamsArgs {
  projectId: string;
  limit?: number;
  offset?: number;
  withCount?: boolean;
}

const definition: ICalmToolDefinition = {
  name: 'calm_tasks_list_workstreams',
  description:
    'List Cloud ALM workstreams (the grouping taxonomy tasks can be filed under) for a project. Requires `projectId` — same @RequestParam UUID contract as calm_tasks_list_deliverables.',
  inputSchema: {
    type: 'object',
    required: ['projectId'],
    properties: {
      projectId: {
        type: 'string',
        description: 'Project id (required scope).',
      },
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
  if (!args?.projectId) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'projectId is required',
    });
  }
  const limit = clampListLimit(args.limit);
  const offset = args.offset && args.offset > 0 ? Math.floor(args.offset) : 0;
  let query = ODataQuery.new().top(limit).skip(offset);
  if (args.withCount) query = query.count();
  try {
    const collection = await ctx.calm
      .getTasks()
      .listWorkstreams(args.projectId, query);
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
