import type {
  IDocument,
  IUpdateDocumentParams,
} from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export interface IUpdateDocumentArgs extends IUpdateDocumentParams {
  uuid: string;
}

const definition: ICalmToolDefinition = {
  name: 'calm_documents_update',
  description:
    'Update fields on an existing Cloud ALM document (PATCH — only fields you pass are modified). Destructive. Identify by `uuid`. Returns the updated document.',
  inputSchema: {
    type: 'object',
    required: ['uuid'],
    properties: {
      uuid: { type: 'string', description: 'Document UUID.' },
      title: { type: 'string', description: 'New title.' },
      content: { type: 'string', description: 'New content.' },
      statusCode: { type: 'string', description: 'New status code.' },
      priorityCode: { type: 'string', description: 'New priority.' },
      typeCode: {
        type: 'string',
        description: 'New document type code (write-side spelling).',
      },
    },
  },
};

const handler: CalmToolHandler<IUpdateDocumentArgs, IDocument> = async (
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
    return await ctx.calm.getDocuments().update(uuid, patch);
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const updateDocumentTool: ICalmHandlerEntry<
  IUpdateDocumentArgs,
  IDocument
> = {
  toolDefinition: definition,
  handler,
};
