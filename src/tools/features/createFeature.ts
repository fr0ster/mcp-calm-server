import type { ICreateFeatureParams, IFeature } from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export type ICreateFeatureArgs = ICreateFeatureParams;

const definition: ICalmToolDefinition = {
  name: 'calm_features_create',
  description:
    'Create a new Cloud ALM feature. Destructive. Requires `title` and `projectId`; other fields are optional. Returns the newly created feature (including the server-generated UUID and displayId).',
  inputSchema: {
    type: 'object',
    required: ['title', 'projectId'],
    properties: {
      title: {
        type: 'string',
        description: 'Short, human-readable feature title.',
      },
      projectId: {
        type: 'string',
        description: 'Cloud ALM project identifier the feature belongs to.',
      },
      description: {
        type: 'string',
        description: 'Optional long-form description.',
      },
      priorityCode: {
        type: 'string',
        description:
          'Optional priority code (string on write). Discover valid values via calm_features_list_priorities.',
      },
      statusCode: {
        type: 'string',
        description:
          'Optional starting status code. Discover valid values via calm_features_list_statuses.',
      },
      releaseId: { type: 'string', description: 'Optional release id.' },
      scopeId: { type: 'string', description: 'Optional scope id.' },
    },
  },
};

const handler: CalmToolHandler<ICreateFeatureArgs, IFeature> = async (
  ctx,
  args,
) => {
  if (!args?.title || !args?.projectId) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'title and projectId are required',
    });
  }
  try {
    return await ctx.calm.getFeatures().create(args);
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const createFeatureTool: ICalmHandlerEntry<
  ICreateFeatureArgs,
  IFeature
> = {
  toolDefinition: definition,
  handler,
};
