import type { IFeature } from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export interface IGetFeatureByDisplayIdArgs {
  displayId: string;
}

const definition: ICalmToolDefinition = {
  name: 'calm_features_get_by_display_id',
  description:
    'Fetch a Cloud ALM feature by its human-facing displayId (e.g. "6-123" where 6 is the project number and 123 is the feature sequence). Use when the user references features by display id rather than UUID. Returns the full feature record. Raises NOT_FOUND if no feature matches.',
  inputSchema: {
    type: 'object',
    required: ['displayId'],
    properties: {
      displayId: {
        type: 'string',
        description: 'Feature displayId, e.g. "6-123".',
      },
    },
  },
};

const handler: CalmToolHandler<IGetFeatureByDisplayIdArgs, IFeature> = async (
  ctx,
  args,
) => {
  if (!args?.displayId) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'displayId is required',
    });
  }
  try {
    return await ctx.calm.getFeatures().getByDisplayId(args.displayId);
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const getFeatureByDisplayIdTool: ICalmHandlerEntry<
  IGetFeatureByDisplayIdArgs,
  IFeature
> = {
  toolDefinition: definition,
  handler,
};
