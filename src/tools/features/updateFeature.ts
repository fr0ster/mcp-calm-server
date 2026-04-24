import type { IFeature, IUpdateFeatureParams } from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export interface IUpdateFeatureArgs extends IUpdateFeatureParams {
  uuid: string;
}

const definition: ICalmToolDefinition = {
  name: 'calm_features_update',
  description:
    'Update fields on an existing Cloud ALM feature (PATCH — only fields you pass are modified). Destructive. Identify the feature by `uuid`. Returns the updated feature.',
  inputSchema: {
    type: 'object',
    required: ['uuid'],
    properties: {
      uuid: { type: 'string', description: 'Feature UUID.' },
      title: { type: 'string', description: 'New title (if changing).' },
      description: { type: 'string', description: 'New description.' },
      priorityCode: {
        type: 'string',
        description: 'New priority code (string).',
      },
      statusCode: { type: 'string', description: 'New status code.' },
      releaseId: { type: 'string', description: 'New release id.' },
      scopeId: { type: 'string', description: 'New scope id.' },
    },
  },
};

const handler: CalmToolHandler<IUpdateFeatureArgs, IFeature> = async (
  ctx,
  args,
) => {
  if (!args?.uuid) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'uuid is required',
    });
  }
  const { uuid, ...patch } = args;
  try {
    return await ctx.calm.getFeatures().update(uuid, patch);
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const updateFeatureTool: ICalmHandlerEntry<
  IUpdateFeatureArgs,
  IFeature
> = {
  toolDefinition: definition,
  handler,
};
