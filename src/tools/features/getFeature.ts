import type { IFeature } from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export interface IGetFeatureArgs {
  uuid: string;
}

const definition: ICalmToolDefinition = {
  name: 'calm_features_get',
  description:
    'Fetch a single Cloud ALM feature by its UUID. Use this after `calm_features_list` has given you candidate UUIDs. Returns the full feature record (all fields).',
  inputSchema: {
    type: 'object',
    required: ['uuid'],
    properties: {
      uuid: {
        type: 'string',
        description: 'Feature UUID (from a prior list result or a known key).',
      },
    },
  },
};

const handler: CalmToolHandler<IGetFeatureArgs, IFeature> = async (
  ctx,
  args,
) => {
  if (!args?.uuid) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'uuid is required',
    });
  }
  try {
    return await ctx.calm.getFeatures().get(args.uuid);
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const getFeatureTool: ICalmHandlerEntry<IGetFeatureArgs, IFeature> = {
  toolDefinition: definition,
  handler,
};
