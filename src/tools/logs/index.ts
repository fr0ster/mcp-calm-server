import { HandlerGroup } from '../../registry/HandlerGroup';
import type { ICalmHandlerEntry } from '../../registry/types';

// Tools land here as they are implemented (see PLAN.md milestones M2-M4).
export const LOGS_HANDLERS: readonly ICalmHandlerEntry[] = [];

export const LOGS_GROUP = new HandlerGroup('logs', LOGS_HANDLERS);
