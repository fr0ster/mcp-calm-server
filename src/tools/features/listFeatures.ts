import { type IFeature, ODataQuery } from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import {
  CalmToolError,
  clampListLimit,
  DEFAULT_LIST_LIMIT,
  escapeODataString,
  type IListResponse,
  joinAndFilters,
  MAX_LIST_LIMIT,
  mapCalmErrorForTool,
  toListResponse,
} from '../../utils';

/**
 * Fields returned by default — chosen to be compact while useful in
 * the vast majority of report/lookup workflows. Callers can override
 * via `fields`.
 */
const DEFAULT_FIELDS = [
  'uuid',
  'displayId',
  'title',
  'statusCode',
  'priorityCode',
  'modifiedAt',
] as const;

const ALLOWED_FIELDS = [
  'uuid',
  'displayId',
  'title',
  'description',
  'projectId',
  'statusCode',
  'priorityCode',
  'releaseId',
  'scopeId',
  'responsibleId',
  'modifiedAt',
  'createdAt',
  'type',
  'workstreamId',
  'tags',
] as const;
type AllowedField = (typeof ALLOWED_FIELDS)[number];

export interface IListFeaturesArgs {
  projectId: string;
  status?: string;
  priorityCode?: string;
  responsibleId?: string;
  fields?: AllowedField[];
  limit?: number;
  offset?: number;
  /** Return `@odata.count` so the LLM knows whether to paginate. */
  withCount?: boolean;
}

const definition: ICalmToolDefinition = {
  name: 'calm_features_list',
  description:
    'List Cloud ALM features for a given project. Returns a compact record per feature (by default: uuid, displayId, title, statusCode, priorityCode, modifiedAt). Use `status` or `priorityCode` to filter, `limit` (max 200) + `offset` to paginate, `fields` to add/narrow columns, `withCount` to get the total matching count.',
  inputSchema: {
    type: 'object',
    required: ['projectId'],
    properties: {
      projectId: {
        type: 'string',
        description:
          'Cloud ALM project identifier. Get candidates via calm_projects_list.',
      },
      status: {
        type: 'string',
        description:
          'Filter by statusCode (e.g. "OPEN", "IN_PROGRESS", "CLOSED"). Use calm_features_list_statuses to discover valid values.',
      },
      priorityCode: {
        type: 'string',
        description:
          'Filter by priority (string code as the API expects on write; on read priority comes back as a number).',
      },
      responsibleId: {
        type: 'string',
        description: 'Filter by the responsibleId (assignee) field.',
      },
      fields: {
        type: 'array',
        description:
          'Subset of feature fields to return. Use this to trim payload or include non-default fields like description or tags.',
        items: { type: 'string', enum: [...ALLOWED_FIELDS] },
      },
      limit: {
        type: 'integer',
        description: `Max items to return (default ${DEFAULT_LIST_LIMIT}, capped at ${MAX_LIST_LIMIT}).`,
        minimum: 1,
        maximum: MAX_LIST_LIMIT,
      },
      offset: {
        type: 'integer',
        description: 'Zero-based offset for pagination.',
        minimum: 0,
      },
      withCount: {
        type: 'boolean',
        description: 'Include total matching count in the response.',
      },
    },
  },
};

function buildQuery(args: IListFeaturesArgs): {
  query: ODataQuery;
  limit: number;
  offset: number;
} {
  const limit = clampListLimit(args.limit);
  const offset = args.offset && args.offset > 0 ? Math.floor(args.offset) : 0;

  const filter = joinAndFilters(
    `projectId eq '${escapeODataString(args.projectId)}'`,
    args.status
      ? `statusCode eq '${escapeODataString(args.status)}'`
      : undefined,
    args.priorityCode
      ? `priorityCode eq '${escapeODataString(args.priorityCode)}'`
      : undefined,
    args.responsibleId
      ? `responsibleId eq '${escapeODataString(args.responsibleId)}'`
      : undefined,
  );

  const fields =
    args.fields && args.fields.length > 0 ? args.fields : DEFAULT_FIELDS;

  let query = ODataQuery.new()
    .select([...fields])
    .top(limit)
    .skip(offset);
  if (filter) query = query.filter(filter);
  if (args.withCount) query = query.count();

  return { query, limit, offset };
}

const handler: CalmToolHandler<
  IListFeaturesArgs,
  IListResponse<Partial<IFeature>>
> = async (ctx, args) => {
  if (!args?.projectId) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'projectId is required',
    });
  }
  const { query, limit, offset } = buildQuery(args);
  try {
    const collection = await ctx.calm.getFeatures().list(query);
    return toListResponse(collection, { limit, offset });
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const listFeaturesTool: ICalmHandlerEntry<
  IListFeaturesArgs,
  IListResponse<Partial<IFeature>>
> = {
  toolDefinition: definition,
  handler,
};
