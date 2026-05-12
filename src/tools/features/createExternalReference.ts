import type {
  ICreateExternalReferenceParams,
  IExternalReference,
} from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export type ICreateExternalReferenceArgs = ICreateExternalReferenceParams;

const definition: ICalmToolDefinition = {
  name: 'calm_features_create_external_reference',
  description:
    'Attach an external reference (link to a record in another system) to a Cloud ALM feature. Destructive. Requires `id` (caller-supplied external id, e.g. a Jira key), `parentUuid` (the feature UUID), and `name`. Returns the created reference.',
  inputSchema: {
    type: 'object',
    required: ['id', 'parentUuid', 'name'],
    properties: {
      id: {
        type: 'string',
        description: 'External system id (e.g. Jira issue key).',
      },
      parentUuid: {
        type: 'string',
        description: 'UUID of the feature the reference attaches to.',
      },
      name: {
        type: 'string',
        description: 'Human-readable name for the link.',
      },
      url: {
        type: 'string',
        description: 'Optional URL pointing to the external record.',
      },
    },
  },
};

const handler: CalmToolHandler<
  ICreateExternalReferenceArgs,
  IExternalReference
> = async (ctx, args) => {
  if (!args?.id || !args?.parentUuid || !args?.name) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'id, parentUuid and name are required',
    });
  }
  try {
    return await ctx.calm.getFeatures().createExternalReference(args);
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const createExternalReferenceTool: ICalmHandlerEntry<
  ICreateExternalReferenceArgs,
  IExternalReference
> = {
  toolDefinition: definition,
  handler,
};
