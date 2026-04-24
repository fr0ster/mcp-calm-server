import type { IDocument } from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export interface IGetDocumentArgs {
  uuid: string;
}

const definition: ICalmToolDefinition = {
  name: 'calm_documents_get',
  description:
    'Fetch a Cloud ALM document by UUID. Returns the full document record including `content`.',
  inputSchema: {
    type: 'object',
    required: ['uuid'],
    properties: {
      uuid: { type: 'string', description: 'Document UUID.' },
    },
  },
};

const handler: CalmToolHandler<IGetDocumentArgs, IDocument> = async (
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
    return await ctx.calm.getDocuments().get(args.uuid);
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const getDocumentTool: ICalmHandlerEntry<IGetDocumentArgs, IDocument> = {
  toolDefinition: definition,
  handler,
};
