import { type IProject, ODataQuery } from '@mcp-abap-adt/calm-client';
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
  'id',
  'name',
  'status',
  'type',
  'programId',
  'modifiedAt',
] as const;

const ALLOWED_FIELDS = [
  'id',
  'name',
  'description',
  'status',
  'type',
  'programId',
  'createdAt',
  'modifiedAt',
] as const;
type AllowedField = (typeof ALLOWED_FIELDS)[number];

export interface IListProjectsArgs {
  status?: string;
  programId?: string;
  fields?: AllowedField[];
  limit?: number;
  offset?: number;
  withCount?: boolean;
}

const definition: ICalmToolDefinition = {
  name: 'calm_projects_list',
  description:
    'List Cloud ALM projects. Optionally filter by status or programId. Returns compact records by default; use `fields` to include description or createdAt.',
  inputSchema: {
    type: 'object',
    properties: {
      status: { type: 'string' },
      programId: { type: 'string' },
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
  IListProjectsArgs,
  IListResponse<Partial<IProject>>
> = async (ctx, args) => {
  const limit = clampListLimit(args?.limit);
  const offset = args?.offset && args.offset > 0 ? Math.floor(args.offset) : 0;
  const filter = joinAndFilters(
    args?.status ? `status eq '${escapeODataString(args.status)}'` : undefined,
    args?.programId
      ? `programId eq '${escapeODataString(args.programId)}'`
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
    const collection = await ctx.calm.getProjects().list(query);
    return toListResponse(collection, { limit, offset });
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const listProjectsTool: ICalmHandlerEntry<
  IListProjectsArgs,
  IListResponse<Partial<IProject>>
> = {
  toolDefinition: definition,
  handler,
};
