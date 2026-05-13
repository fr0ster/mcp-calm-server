import type { IDocumentStatus } from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { mapCalmErrorForTool } from '../../utils';

export interface IListDocumentStatusesResult {
  items: IDocumentStatus[];
}

const definition: ICalmToolDefinition = {
  name: 'calm_documents_list_statuses',
  description:
    'List the valid status codes for Cloud ALM documents (tenant-wide lookup). Use to discover the vocabulary for the `statusCode` filter / write argument.',
  inputSchema: { type: 'object', properties: {} },
};

const handler: CalmToolHandler<unknown, IListDocumentStatusesResult> = async (
  ctx,
) => {
  try {
    const collection = await ctx.calm.getDocuments().listStatuses();
    return { items: collection.value ?? [] };
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const listDocumentStatusesTool: ICalmHandlerEntry<
  unknown,
  IListDocumentStatusesResult
> = {
  toolDefinition: definition,
  handler,
};
