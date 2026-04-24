import type { IFeatureStatus } from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { mapCalmErrorForTool } from '../../utils';

export interface IListFeatureStatusesResult {
  items: IFeatureStatus[];
}

const definition: ICalmToolDefinition = {
  name: 'calm_features_list_statuses',
  description:
    'List the valid status codes for Cloud ALM features (tenant-wide lookup). Use to discover the vocabulary for the `status` filter on calm_features_list or the `statusCode` arg on create/update.',
  inputSchema: { type: 'object', properties: {} },
};

const handler: CalmToolHandler<unknown, IListFeatureStatusesResult> = async (
  ctx,
) => {
  try {
    const collection = await ctx.calm.getFeatures().listStatuses();
    return { items: collection.value ?? [] };
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const listFeatureStatusesTool: ICalmHandlerEntry<
  unknown,
  IListFeatureStatusesResult
> = {
  toolDefinition: definition,
  handler,
};
