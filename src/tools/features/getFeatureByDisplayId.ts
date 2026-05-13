import type { IFeature } from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export interface IGetFeatureByDisplayIdArgs {
  projectId: string;
  displayId: string;
}

const definition: ICalmToolDefinition = {
  name: 'calm_features_get_by_display_id',
  description:
    'Fetch a Cloud ALM feature by its human-facing displayId (e.g. "6-123" where 6 is the project sequence and 123 is the feature sequence). Requires `projectId` — the underlying Features endpoint is project-scoped, and the displayId itself is unique only within a project. Returns the full feature record; raises NOT_FOUND if no feature matches inside that project.',
  inputSchema: {
    type: 'object',
    required: ['projectId', 'displayId'],
    properties: {
      projectId: {
        type: 'string',
        description: 'Project id the feature belongs to.',
      },
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
  if (!args?.projectId || !args?.displayId) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'projectId and displayId are required',
    });
  }
  try {
    return await ctx.calm
      .getFeatures()
      .getByDisplayId(args.projectId, args.displayId);
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
