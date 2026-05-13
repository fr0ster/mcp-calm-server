import { type IDeliverable, ODataQuery } from '@mcp-abap-adt/calm-client';
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

export interface IListDeliverablesArgs {
  projectId: string;
  limit?: number;
  offset?: number;
  withCount?: boolean;
}

const definition: ICalmToolDefinition = {
  name: 'calm_tasks_list_deliverables',
  description:
    'List Cloud ALM deliverables (work-product entities tasks can reference) for a project. Requires `projectId` — the Tasks service exposes this endpoint with @RequestParam UUID projectId and rejects calls without it (sandbox behaviour was inconsistent before calm-client 0.2.0; live tenants always 400).',
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
  IListDeliverablesArgs,
  IListResponse<IDeliverable>
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
      .listDeliverables(args.projectId, query);
    return toListResponse(collection, { limit, offset });
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const listDeliverablesTool: ICalmHandlerEntry<
  IListDeliverablesArgs,
  IListResponse<IDeliverable>
> = {
  toolDefinition: definition,
  handler,
};
