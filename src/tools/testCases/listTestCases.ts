import { type ITestCase, ODataQuery } from '@mcp-abap-adt/calm-client';
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

const DEFAULT_FIELDS = [
  'uuid',
  'title',
  'statusCode',
  'projectId',
  'modifiedAt',
] as const;

const ALLOWED_FIELDS = [
  'uuid',
  'title',
  'description',
  'statusCode',
  'projectId',
  'modifiedAt',
  'createdAt',
] as const;
type AllowedField = (typeof ALLOWED_FIELDS)[number];

export interface IListTestCasesArgs {
  projectId?: string;
  status?: string;
  fields?: AllowedField[];
  limit?: number;
  offset?: number;
  withCount?: boolean;
}

const definition: ICalmToolDefinition = {
  name: 'calm_test_cases_list',
  description:
    'List manual test cases, optionally scoped to a project or status. Returns compact records.',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: { type: 'string' },
      status: { type: 'string', description: 'Filter by statusCode.' },
      fields: {
        type: 'array',
        items: { type: 'string', enum: [...ALLOWED_FIELDS] },
      },
      limit: { type: 'integer', minimum: 1, maximum: MAX_LIST_LIMIT },
      offset: { type: 'integer', minimum: 0 },
      withCount: { type: 'boolean' },
    },
  },
};

const handler: CalmToolHandler<
  IListTestCasesArgs,
  IListResponse<Partial<ITestCase>>
> = async (ctx, args) => {
  const limit = clampListLimit(args?.limit);
  const offset = args?.offset && args.offset > 0 ? Math.floor(args.offset) : 0;
  const filter = joinAndFilters(
    args?.projectId
      ? `projectId eq '${escapeODataString(args.projectId)}'`
      : undefined,
    args?.status
      ? `statusCode eq '${escapeODataString(args.status)}'`
      : undefined,
  );
  const fields =
    args?.fields && args.fields.length > 0 ? args.fields : DEFAULT_FIELDS;
  let query = ODataQuery.new()
    .select([...fields])
    .top(limit)
    .skip(offset);
  if (filter) query = query.filter(filter);
  if (args?.withCount) query = query.count();

  try {
    const collection = await ctx.calm.getTestCases().list(query);
    return toListResponse(collection, { limit, offset });
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const listTestCasesTool: ICalmHandlerEntry<
  IListTestCasesArgs,
  IListResponse<Partial<ITestCase>>
> = {
  toolDefinition: definition,
  handler,
};
