import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export interface IDeleteFeatureArgs {
  uuid: string;
}

export interface IDeleteFeatureResult {
  deleted: true;
  uuid: string;
}

const definition: ICalmToolDefinition = {
  name: 'calm_features_delete',
  description:
    'Delete a Cloud ALM feature by its UUID. Destructive. Returns a confirmation object; raises NOT_FOUND if the feature does not exist. Does not cascade to child entities — clean those up explicitly first.',
  inputSchema: {
    type: 'object',
    required: ['uuid'],
    properties: {
      uuid: { type: 'string', description: 'Feature UUID to delete.' },
    },
  },
};

const handler: CalmToolHandler<
  IDeleteFeatureArgs,
  IDeleteFeatureResult
> = async (ctx, args) => {
  if (!args?.uuid) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'uuid is required',
    });
  }
  try {
    await ctx.calm.getFeatures().delete(args.uuid);
    return { deleted: true, uuid: args.uuid };
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const deleteFeatureTool: ICalmHandlerEntry<
  IDeleteFeatureArgs,
  IDeleteFeatureResult
> = {
  toolDefinition: definition,
  handler,
};
