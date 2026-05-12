import { HandlerGroup } from '../../registry/HandlerGroup';
import type { ICalmHandlerEntry } from '../../registry/types';
import { createDocumentTool } from './createDocument';
import { deleteDocumentTool } from './deleteDocument';
import { getDocumentTool } from './getDocument';
import { listDocumentsTool } from './listDocuments';
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
export type { IListDocumentsArgs } from './listDocuments';
export { listDocumentsTool } from './listDocuments';
export type { IUpdateDocumentArgs } from './updateDocument';
export { updateDocumentTool } from './updateDocument';

export const DOCUMENTS_HANDLERS: readonly ICalmHandlerEntry[] = [
  listDocumentsTool,
  getDocumentTool,
  createDocumentTool,
  updateDocumentTool,
  deleteDocumentTool,
];

export const DOCUMENTS_GROUP = new HandlerGroup(
  'documents',
  DOCUMENTS_HANDLERS,
);
