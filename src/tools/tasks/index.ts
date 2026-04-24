import { HandlerGroup } from '../../registry/HandlerGroup';
import type { ICalmHandlerEntry } from '../../registry/types';

// Tools land here as they are implemented (see PLAN.md milestones M2-M4).
export const TASKS_HANDLERS: readonly ICalmHandlerEntry[] = [];

export const TASKS_GROUP = new HandlerGroup('tasks', TASKS_HANDLERS);
