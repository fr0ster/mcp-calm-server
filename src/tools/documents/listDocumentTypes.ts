import type { IDocumentType } from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { mapCalmErrorForTool } from '../../utils';

export interface IListDocumentTypesResult {
  items: IDocumentType[];
}

const definition: ICalmToolDefinition = {
  name: 'calm_documents_list_types',
  description:
    'List the valid document type codes (tenant-wide lookup). Read-side returns each entry as `documentTypeCode`; on write a document tool takes `typeCode`. Use to discover the vocabulary.',
  inputSchema: { type: 'object', properties: {} },
};

const handler: CalmToolHandler<unknown, IListDocumentTypesResult> = async (
  ctx,
) => {
  try {
    const collection = await ctx.calm.getDocuments().listTypes();
    return { items: collection.value ?? [] };
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const listDocumentTypesTool: ICalmHandlerEntry<
  unknown,
  IListDocumentTypesResult
> = {
  toolDefinition: definition,
  handler,
};
