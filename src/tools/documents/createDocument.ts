import type {
  ICreateDocumentParams,
  IDocument,
} from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export type ICreateDocumentArgs = ICreateDocumentParams;

const definition: ICalmToolDefinition = {
  name: 'calm_documents_create',
  description:
    'Create a new Cloud ALM document. Destructive. Requires `title`; other fields are optional. NOTE the write-side field is `typeCode` (read-side returns `documentTypeCode`). Returns the newly created document.',
  inputSchema: {
    type: 'object',
    required: ['title'],
    properties: {
      title: { type: 'string', description: 'Document title.' },
      content: {
        type: 'string',
        description: 'Optional document body (markdown or plain text).',
      },
      projectId: {
        type: 'string',
        description: 'Optional project scope.',
      },
      typeCode: {
        type: 'string',
        description: 'Document type code (write-side spelling).',
      },
      statusCode: { type: 'string', description: 'Optional starting status.' },
      priorityCode: { type: 'string', description: 'Optional priority.' },
    },
  },
};

const handler: CalmToolHandler<ICreateDocumentArgs, IDocument> = async (
  ctx,
  args,
) => {
  if (!args?.title) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'title is required',
    });
  }
  try {
    return await ctx.calm.getDocuments().create(args);
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const createDocumentTool: ICalmHandlerEntry<
  ICreateDocumentArgs,
  IDocument
> = {
  toolDefinition: definition,
  handler,
};
