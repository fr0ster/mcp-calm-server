import { type IHierarchyNode, ODataQuery } from '@mcp-abap-adt/calm-client';
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
  'displayId',
  'title',
  'hierarchyLevel',
  'parentNodeUuid',
  'rootNodeUuid',
] as const;

const ALLOWED_FIELDS = [
  'uuid',
  'displayId',
  'title',
  'description',
  'hierarchyLevel',
  'sequence',
  'parentTitles',
  'parentNodeUuid',
  'rootNodeUuid',
  'modifiedAt',
  'createdAt',
] as const;
type AllowedField = (typeof ALLOWED_FIELDS)[number];

export interface IListHierarchyArgs {
  rootNodeUuid?: string;
  parentNodeUuid?: string;
  fields?: AllowedField[];
  limit?: number;
  offset?: number;
  withCount?: boolean;
}

const definition: ICalmToolDefinition = {
  name: 'calm_hierarchy_list',
  description:
    'List process hierarchy nodes. Filter by rootNodeUuid (scope to a hierarchy) or parentNodeUuid (direct children). Returns compact records.',
  inputSchema: {
    type: 'object',
    properties: {
      rootNodeUuid: { type: 'string' },
      parentNodeUuid: { type: 'string' },
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
  IListHierarchyArgs,
  IListResponse<Partial<IHierarchyNode>>
> = async (ctx, args) => {
  const limit = clampListLimit(args?.limit);
  const offset = args?.offset && args.offset > 0 ? Math.floor(args.offset) : 0;
  const filter = joinAndFilters(
    args?.rootNodeUuid
      ? `rootNodeUuid eq '${escapeODataString(args.rootNodeUuid)}'`
      : undefined,
    args?.parentNodeUuid
      ? `parentNodeUuid eq '${escapeODataString(args.parentNodeUuid)}'`
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
    const collection = await ctx.calm.getHierarchy().list(query);
    return toListResponse(collection, { limit, offset });
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const listHierarchyTool: ICalmHandlerEntry<
  IListHierarchyArgs,
  IListResponse<Partial<IHierarchyNode>>
> = {
  toolDefinition: definition,
  handler,
};
