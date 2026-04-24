import { HandlerGroup } from '../../registry/HandlerGroup';
import type { ICalmHandlerEntry } from '../../registry/types';

// Tools land here as they are implemented (see PLAN.md milestones M2-M4).
export const DOCUMENTS_HANDLERS: readonly ICalmHandlerEntry[] = [];

export const DOCUMENTS_GROUP = new HandlerGroup(
  'documents',
  DOCUMENTS_HANDLERS,
);
