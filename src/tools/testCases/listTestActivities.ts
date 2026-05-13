import { type ITestActivity, ODataQuery } from '@mcp-abap-adt/calm-client';
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

export interface IListTestActivitiesArgs {
  parent_ID?: string;
  limit?: number;
  offset?: number;
  withCount?: boolean;
}

const definition: ICalmToolDefinition = {
  name: 'calm_test_cases_list_activities',
  description:
    'List test activities (the mid-tier collection nested under test cases). Optionally filter by `parent_ID` (the parent test case UUID).',
  inputSchema: {
    type: 'object',
    properties: {
      parent_ID: {
        type: 'string',
        description: 'Optional parent test case UUID — scope to one case.',
      },
      limit: { type: 'integer', minimum: 1, maximum: MAX_LIST_LIMIT },
      offset: { type: 'integer', minimum: 0 },
      withCount: { type: 'boolean' },
    },
  },
};

const handler: CalmToolHandler<
  IListTestActivitiesArgs,
  IListResponse<ITestActivity>
> = async (ctx, args) => {
  const limit = clampListLimit(args?.limit);
  const offset = args?.offset && args.offset > 0 ? Math.floor(args.offset) : 0;
  const filter = joinAndFilters(
    args?.parent_ID
      ? `parent_ID eq '${escapeODataString(args.parent_ID)}'`
      : undefined,
  );
  let query = ODataQuery.new().top(limit).skip(offset);
  if (filter) query = query.filter(filter);
  if (args?.withCount) query = query.count();
  try {
    const collection = await ctx.calm.getTestCases().listActivities(query);
    return toListResponse(collection, { limit, offset });
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const listTestActivitiesTool: ICalmHandlerEntry<
  IListTestActivitiesArgs,
  IListResponse<ITestActivity>
> = {
  toolDefinition: definition,
  handler,
};
