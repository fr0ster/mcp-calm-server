import { HandlerGroup } from '../../registry/HandlerGroup';
import type { ICalmHandlerEntry } from '../../registry/types';
import { getLogsTool } from './getLogs';

export type { IGetLogsArgs, IGetLogsResult } from './getLogs';
export { getLogsTool } from './getLogs';

export const LOGS_HANDLERS: readonly ICalmHandlerEntry[] = [getLogsTool];

export const LOGS_GROUP = new HandlerGroup('logs', LOGS_HANDLERS);
