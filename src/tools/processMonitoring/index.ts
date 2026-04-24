import { HandlerGroup } from '../../registry/HandlerGroup';
import type { ICalmHandlerEntry } from '../../registry/types';
import { listBusinessProcessesTool } from './listBusinessProcesses';

export type {
  IListBusinessProcessesArgs,
  IListBusinessProcessesResult,
} from './listBusinessProcesses';
export { listBusinessProcessesTool } from './listBusinessProcesses';

export const PROCESSMONITORING_HANDLERS: readonly ICalmHandlerEntry[] = [
  listBusinessProcessesTool,
];

export const PROCESSMONITORING_GROUP = new HandlerGroup(
  'processMonitoring',
  PROCESSMONITORING_HANDLERS,
);
