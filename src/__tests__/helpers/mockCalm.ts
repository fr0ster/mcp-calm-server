import type { CalmClient } from '@mcp-abap-adt/calm-client';

export interface IRecordedCall {
  service: string;
  method: string;
  args: unknown[];
  url?: string;
}

export interface IMockCalmResult {
  calm: CalmClient;
  calls: IRecordedCall[];
}

type Responder = (call: IRecordedCall) => unknown;

/**
 * Generic mock `CalmClient`. Each `getXxx()` getter returns a proxy
 * whose every method call is recorded as `{ service, method, args, url? }`
 * and whose return value is produced by `respond`. If `respond` returns
 * an Error, the method throws it (useful for error-mapping tests).
 */
export function mockCalm(respond: Responder): IMockCalmResult {
  const calls: IRecordedCall[] = [];

  const makeServiceProxy = (service: string) =>
    new Proxy(
      {},
      {
        get(_target, methodKey) {
          const method = String(methodKey);
          return async (...args: unknown[]) => {
            let url: string | undefined;
            if (args[0] && typeof args[0] === 'object') {
              const maybeQuery = args[0] as { toQueryString?: () => string };
              if (typeof maybeQuery.toQueryString === 'function') {
                url = maybeQuery.toQueryString();
              }
            }
            const call: IRecordedCall = { service, method, args, url };
            calls.push(call);
            const out = respond(call);
            if (out instanceof Error) throw out;
            return out;
          };
        },
      },
    );

  const calm = new Proxy({} as CalmClient, {
    get(_target, key) {
      const name = String(key);
      if (!name.startsWith('get') || name === 'getConnection') return undefined;
      // getFeatures → 'features', getTestCases → 'testCases'
      const service = name.slice(3, 4).toLowerCase() + name.slice(4);
      return () => makeServiceProxy(service);
    },
  });

  return { calm, calls };
}

/**
 * Narrower mock used by older Features tests — kept for backward
 * compatibility. Prefer `mockCalm` for new tool tests.
 */
export function mockCalmForFeatures(respond: Responder): IMockCalmResult {
  return mockCalm(respond);
}
