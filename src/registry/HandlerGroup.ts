import type { ICalmHandlerEntry, ICalmHandlerGroup } from './types';

/**
 * Minimal `ICalmHandlerGroup` implementation. Wraps a static list of
 * handler entries with a group name. All per-service tool modules
 * export one of these via `XXX_GROUP`.
 */
export class HandlerGroup implements ICalmHandlerGroup {
  constructor(
    private readonly name: string,
    private readonly handlers: readonly ICalmHandlerEntry[],
  ) {}

  getName(): string {
    return this.name;
  }

  getHandlers(): readonly ICalmHandlerEntry[] {
    return this.handlers;
  }
}
