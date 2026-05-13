import { type IExternalReference, ODataQuery } from '@mcp-abap-adt/calm-client';
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

export interface IListExternalReferencesArgs {
  parentUuid?: string;
  limit?: number;
  offset?: number;
  withCount?: boolean;
}

const definition: ICalmToolDefinition = {
  name: 'calm_features_list_external_references',
  description:
    'List external references attached to features (links to other systems like Jira). Optionally filter by `parentUuid` to scope to a single feature.',
  inputSchema: {
    type: 'object',
    properties: {
      parentUuid: {
        type: 'string',
        description: 'Optional feature UUID — scope to that feature only.',
      },
      limit: { type: 'integer', minimum: 1, maximum: MAX_LIST_LIMIT },
      offset: { type: 'integer', minimum: 0 },
      withCount: { type: 'boolean' },
    },
  },
};

const handler: CalmToolHandler<
  IListExternalReferencesArgs,
  IListResponse<IExternalReference>
> = async (ctx, args) => {
  const limit = clampListLimit(args?.limit);
  const offset = args?.offset && args.offset > 0 ? Math.floor(args.offset) : 0;
  const filter = joinAndFilters(
    args?.parentUuid
      ? `parentUuid eq '${escapeODataString(args.parentUuid)}'`
      : undefined,
  );
  let query = ODataQuery.new().top(limit).skip(offset);
  if (filter) query = query.filter(filter);
  if (args?.withCount) query = query.count();
  try {
    const collection = await ctx.calm
      .getFeatures()
      .listExternalReferences(query);
    return toListResponse(collection, { limit, offset });
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const listExternalReferencesTool: ICalmHandlerEntry<
  IListExternalReferencesArgs,
  IListResponse<IExternalReference>
> = {
  toolDefinition: definition,
  handler,
};
