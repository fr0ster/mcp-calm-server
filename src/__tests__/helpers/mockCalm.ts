import type { CalmClient } from '@mcp-abap-adt/calm-client';

export interface IRecordedCall {
  method:
    | 'list'
    | 'get'
    | 'getByDisplayId'
    | 'create'
    | 'update'
    | 'delete'
    | 'listStatuses'
    | 'listPriorities';
  args: unknown[];
  /** URL fragment (for list — the OData query string). Only set by `list`. */
  url?: string;
}

export interface IMockCalmResult {
  calm: CalmClient;
  calls: IRecordedCall[];
}

/**
 * Minimal mock `CalmClient` for unit-testing Feature tools. Each method
 * records `{ method, args, url? }` and defers to the caller-supplied
 * responder. If the responder returns an Error instance, the method
 * throws it — so tests can exercise error-mapping paths.
 */
export function mockCalmForFeatures(
  respond: (call: IRecordedCall) => unknown,
): IMockCalmResult {
  const calls: IRecordedCall[] = [];

  const wrap =
    (method: IRecordedCall['method']) =>
    async (...args: unknown[]) => {
      let url: string | undefined;
      if (method === 'list' && args[0] && typeof args[0] === 'object') {
        url = (args[0] as { toQueryString(): string }).toQueryString();
      }
      const call: IRecordedCall = { method, args, url };
      calls.push(call);
      const out = respond(call);
      if (out instanceof Error) throw out;
      return out;
    };

  const features = {
    list: wrap('list'),
    get: wrap('get'),
    getByDisplayId: wrap('getByDisplayId'),
    create: wrap('create'),
    update: wrap('update'),
    delete: wrap('delete'),
    listStatuses: wrap('listStatuses'),
    listPriorities: wrap('listPriorities'),
  };

  const calm = {
    getFeatures: () => features,
  } as unknown as CalmClient;

  return { calm, calls };
}
