import { HandlerGroup } from '../../registry/HandlerGroup';
import type { ICalmHandlerEntry } from '../../registry/types';

// Tools land here as they are implemented (see PLAN.md milestones M2-M4).
export const PROJECTS_HANDLERS: readonly ICalmHandlerEntry[] = [];

export const PROJECTS_GROUP = new HandlerGroup('projects', PROJECTS_HANDLERS);
