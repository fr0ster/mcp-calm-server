import { type ITimebox, ODataQuery } from '@mcp-abap-adt/calm-client';
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

export interface IListTimeboxesArgs {
  projectId: string;
  limit?: number;
  offset?: number;
  withCount?: boolean;
}

const definition: ICalmToolDefinition = {
  name: 'calm_projects_list_timeboxes',
  description:
    'List timeboxes (sprints / phases) for a Cloud ALM project. Requires `projectId`. Useful when filtering tasks or features by `timeboxName`.',
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
  IListTimeboxesArgs,
  IListResponse<ITimebox>
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
      .getProjects()
      .listTimeboxes(args.projectId, query);
    return toListResponse(collection, { limit, offset });
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const listTimeboxesTool: ICalmHandlerEntry<
  IListTimeboxesArgs,
  IListResponse<ITimebox>
> = {
  toolDefinition: definition,
  handler,
};
