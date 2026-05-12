import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export interface IDeleteExternalReferenceArgs {
  id: string;
  parentUuid: string;
}

export interface IDeleteExternalReferenceResult {
  deleted: true;
  id: string;
  parentUuid: string;
}

const definition: ICalmToolDefinition = {
  name: 'calm_features_delete_external_reference',
  description:
    'Detach an external reference from a Cloud ALM feature. Destructive. Identify the reference by its `id` and the owning feature `parentUuid`. Raises NOT_FOUND if the reference does not exist.',
  inputSchema: {
    type: 'object',
    required: ['id', 'parentUuid'],
    properties: {
      id: {
        type: 'string',
        description: 'External reference id to detach.',
      },
      parentUuid: {
        type: 'string',
        description: 'UUID of the feature owning the reference.',
      },
    },
  },
};

const handler: CalmToolHandler<
  IDeleteExternalReferenceArgs,
  IDeleteExternalReferenceResult
> = async (ctx, args) => {
  if (!args?.id || !args?.parentUuid) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'id and parentUuid are required',
    });
  }
  try {
    await ctx.calm
      .getFeatures()
      .deleteExternalReference(args.id, args.parentUuid);
    return { deleted: true, id: args.id, parentUuid: args.parentUuid };
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const deleteExternalReferenceTool: ICalmHandlerEntry<
  IDeleteExternalReferenceArgs,
  IDeleteExternalReferenceResult
> = {
  toolDefinition: definition,
  handler,
};
