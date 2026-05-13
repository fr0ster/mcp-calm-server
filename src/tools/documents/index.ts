import { HandlerGroup } from '../../registry/HandlerGroup';
import type { ICalmHandlerEntry } from '../../registry/types';
import { createDocumentTool } from './createDocument';
import { deleteDocumentTool } from './deleteDocument';
import { getDocumentTool } from './getDocument';
import { listDocumentStatusesTool } from './listDocumentStatuses';
import { listDocumentsTool } from './listDocuments';
import { listDocumentTypesTool } from './listDocumentTypes';
import { updateDocumentTool } from './updateDocument';

export type { ICreateDocumentArgs } from './createDocument';
export { createDocumentTool } from './createDocument';
export type {
  IDeleteDocumentArgs,
  IDeleteDocumentResult,
} from './deleteDocument';
export { deleteDocumentTool } from './deleteDocument';
export type { IGetDocumentArgs } from './getDocument';
export { getDocumentTool } from './getDocument';
export type { IListDocumentStatusesResult } from './listDocumentStatuses';
export { listDocumentStatusesTool } from './listDocumentStatuses';
export type { IListDocumentsArgs } from './listDocuments';
export { listDocumentsTool } from './listDocuments';
export type { IListDocumentTypesResult } from './listDocumentTypes';
export { listDocumentTypesTool } from './listDocumentTypes';
export type { IUpdateDocumentArgs } from './updateDocument';
export { updateDocumentTool } from './updateDocument';

export const DOCUMENTS_HANDLERS: readonly ICalmHandlerEntry[] = [
  listDocumentsTool,
  getDocumentTool,
  createDocumentTool,
  updateDocumentTool,
  deleteDocumentTool,
  listDocumentStatusesTool,
  listDocumentTypesTool,
];

export const DOCUMENTS_GROUP = new HandlerGroup(
  'documents',
  DOCUMENTS_HANDLERS,
);
