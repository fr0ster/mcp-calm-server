import { type ITaskComment, ODataQuery } from '@mcp-abap-adt/calm-client';
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

export interface IListTaskCommentsArgs {
  taskId: string;
  limit?: number;
  offset?: number;
  withCount?: boolean;
}

const definition: ICalmToolDefinition = {
  name: 'calm_tasks_list_comments',
  description:
    'List comments on a specific task. Comments are ordered by createdAt descending by default in the source API.',
  inputSchema: {
    type: 'object',
    required: ['taskId'],
    properties: {
      taskId: { type: 'string', description: 'Parent task id.' },
      limit: { type: 'integer', minimum: 1, maximum: MAX_LIST_LIMIT },
      offset: { type: 'integer', minimum: 0 },
      withCount: { type: 'boolean' },
    },
  },
};

const handler: CalmToolHandler<
  IListTaskCommentsArgs,
  IListResponse<Partial<ITaskComment>>
> = async (ctx, args) => {
  if (!args?.taskId) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'taskId is required',
    });
  }
  const limit = clampListLimit(args.limit);
  const offset = args.offset && args.offset > 0 ? Math.floor(args.offset) : 0;
  let query = ODataQuery.new().top(limit).skip(offset);
  if (args.withCount) query = query.count();

  try {
    const collection = await ctx.calm
      .getTasks()
      .listComments(args.taskId, query);
    return toListResponse(collection, { limit, offset });
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const listTaskCommentsTool: ICalmHandlerEntry<
  IListTaskCommentsArgs,
  IListResponse<Partial<ITaskComment>>
> = {
  toolDefinition: definition,
  handler,
};
