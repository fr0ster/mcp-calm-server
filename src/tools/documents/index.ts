import { HandlerGroup } from '../../registry/HandlerGroup';
import type { ICalmHandlerEntry } from '../../registry/types';
import { getDocumentTool } from './getDocument';
import { listDocumentsTool } from './listDocuments';

export type { IGetDocumentArgs } from './getDocument';
export { getDocumentTool } from './getDocument';
export type { IListDocumentsArgs } from './listDocuments';
export { listDocumentsTool } from './listDocuments';

export const DOCUMENTS_HANDLERS: readonly ICalmHandlerEntry[] = [
  listDocumentsTool,
  getDocumentTool,
];

export const DOCUMENTS_GROUP = new HandlerGroup(
  'documents',
  DOCUMENTS_HANDLERS,
);
