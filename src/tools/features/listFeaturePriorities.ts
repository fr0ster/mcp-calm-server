import type { IFeaturePriority } from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { mapCalmErrorForTool } from '../../utils';

export interface IListFeaturePrioritiesResult {
  items: IFeaturePriority[];
}

const definition: ICalmToolDefinition = {
  name: 'calm_features_list_priorities',
  description:
    'List the valid priority codes for Cloud ALM features (tenant-wide lookup). Use to map numeric priority values returned on read to human names, or to discover values accepted by calm_features_create / calm_features_update.',
  inputSchema: { type: 'object', properties: {} },
};

const handler: CalmToolHandler<unknown, IListFeaturePrioritiesResult> = async (
  ctx,
) => {
  try {
    const collection = await ctx.calm.getFeatures().listPriorities();
    return { items: collection.value ?? [] };
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const listFeaturePrioritiesTool: ICalmHandlerEntry<
  unknown,
  IListFeaturePrioritiesResult
> = {
  toolDefinition: definition,
  handler,
};
