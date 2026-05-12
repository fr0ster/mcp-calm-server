import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export interface IDeleteDocumentArgs {
  uuid: string;
}

export interface IDeleteDocumentResult {
  deleted: true;
  uuid: string;
}

const definition: ICalmToolDefinition = {
  name: 'calm_documents_delete',
  description:
    'Delete a Cloud ALM document by UUID. Destructive. Returns a confirmation object; raises NOT_FOUND if the document does not exist.',
  inputSchema: {
    type: 'object',
    required: ['uuid'],
    properties: {
      uuid: { type: 'string', description: 'Document UUID to delete.' },
    },
  },
};

const handler: CalmToolHandler<
  IDeleteDocumentArgs,
  IDeleteDocumentResult
> = async (ctx, args) => {
  if (!args?.uuid) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'uuid is required',
    });
  }
  try {
    await ctx.calm.getDocuments().delete(args.uuid);
    return { deleted: true, uuid: args.uuid };
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const deleteDocumentTool: ICalmHandlerEntry<
  IDeleteDocumentArgs,
  IDeleteDocumentResult
> = {
  toolDefinition: definition,
  handler,
};
