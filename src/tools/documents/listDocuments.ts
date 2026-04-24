import { type IDocument, ODataQuery } from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import {
  clampListLimit,
  DEFAULT_LIST_LIMIT,
  escapeODataString,
  type IListResponse,
  joinAndFilters,
  MAX_LIST_LIMIT,
  mapCalmErrorForTool,
  toListResponse,
} from '../../utils';

const DEFAULT_FIELDS = [
  'uuid',
  'displayId',
  'title',
  'documentTypeCode',
  'statusCode',
  'modifiedAt',
] as const;

const ALLOWED_FIELDS = [
  'uuid',
  'displayId',
  'title',
  'content',
  'statusCode',
  'priorityCode',
  'documentTypeCode',
  'sourceCode',
  'projectId',
  'scopeId',
  'modifiedAt',
  'createdAt',
  'tags',
] as const;
type AllowedField = (typeof ALLOWED_FIELDS)[number];

export interface IListDocumentsArgs {
  projectId?: string;
  typeCode?: string;
  fields?: AllowedField[];
  limit?: number;
  offset?: number;
  withCount?: boolean;
}

const definition: ICalmToolDefinition = {
  name: 'calm_documents_list',
  description:
    'List Cloud ALM documents, optionally scoped to a project or a document type. Returns compact records by default. Use calm_documents_list_types to discover valid typeCode values.',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Scope to a project.' },
      typeCode: {
        type: 'string',
        description:
          'Filter by documentTypeCode. On write the API uses `typeCode`; on read it returns `documentTypeCode`.',
      },
      fields: {
        type: 'array',
        description: 'Subset of fields to return.',
        items: { type: 'string', enum: [...ALLOWED_FIELDS] },
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: MAX_LIST_LIMIT,
        description: `Default ${DEFAULT_LIST_LIMIT}, max ${MAX_LIST_LIMIT}.`,
      },
      offset: { type: 'integer', minimum: 0 },
      withCount: { type: 'boolean' },
    },
  },
};

const handler: CalmToolHandler<
  IListDocumentsArgs,
  IListResponse<Partial<IDocument>>
> = async (ctx, args) => {
  const limit = clampListLimit(args?.limit);
  const offset = args?.offset && args.offset > 0 ? Math.floor(args.offset) : 0;
  const filter = joinAndFilters(
    args?.projectId
      ? `projectId eq '${escapeODataString(args.projectId)}'`
      : undefined,
    args?.typeCode
      ? `documentTypeCode eq '${escapeODataString(args.typeCode)}'`
      : undefined,
  );
  const fields =
    args?.fields && args.fields.length > 0 ? args.fields : DEFAULT_FIELDS;
  let query = ODataQuery.new()
    .select([...fields])
    .top(limit)
    .skip(offset);
  if (filter) query = query.filter(filter);
  if (args?.withCount) query = query.count();

  try {
    const collection = await ctx.calm.getDocuments().list(query);
    return toListResponse(collection, { limit, offset });
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const listDocumentsTool: ICalmHandlerEntry<
  IListDocumentsArgs,
  IListResponse<Partial<IDocument>>
> = {
  toolDefinition: definition,
  handler,
};
