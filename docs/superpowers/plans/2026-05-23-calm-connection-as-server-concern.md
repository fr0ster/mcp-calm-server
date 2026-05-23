# CALM connection as a server concern — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move CALM connection ownership out of `@mcp-abap-adt/calm-client` into `@mcp-abap-adt/calm-server`, rewrite the transport on native `fetch`, and consume `CALM_BASE_URL` verbatim (no implicit `/api` injection).

**Architecture:** `calm-client` keeps only API-surface code and depends on the `ICalmConnection` interface from `@mcp-abap-adt/interfaces`. `calm-server` owns concrete connection implementations (`SandboxCalmConnection`, `OAuth2CalmConnection`), a factory, the `serviceRoutes` map, and `XsuaaRefresher`, all under `src/server/connection/`. The existing `BaseCalmMcpServer({ calm: CalmClient })` constructor stays the DI seam.

**Tech Stack:** TypeScript (CommonJS, ES2022), native `fetch` + `AbortSignal.timeout`, Jest, Biome. Two npm packages in separate repos: `~/prj/mcp-calm-client` and `~/prj/mcp-calm-server` (this repo).

**Spec:** `docs/superpowers/specs/2026-05-23-calm-connection-as-server-concern-design.md`

---

## Cross-package boundary & ordering

This plan touches two repos. Per `CLAUDE.md` and the `cross-package-fix-cycle` skill, **Part A (calm-client) ships first** as `0.4.0`, then **Part B (calm-server) bumps the peer dep and ships** as `0.4.0`. Do not start Part B's `npm install` of the new client until Part A is published (or linked locally via `npm link` / `file:` for integration testing).

- **Part A repo:** `/home/okyslytsia/prj/mcp-calm-client`
- **Part B repo:** `/home/okyslytsia/prj/mcp-calm-server` (this one)
- **Publishing** (`npm publish`) is done by the maintainer by hand — the plan stops at "ready to publish" and the human runs it. Agents must not run `npm publish`.

---

## File Structure

### Part A — `mcp-calm-client` (0.4.0, breaking)

- Delete: `src/connection/CalmConnection.ts`
- Delete: `src/connection/serviceRoutes.ts`
- Modify: `src/connection/parseCalmError.ts` — split out `calmErrorFromBody`, drop axios `toCalmApiError`
- Modify: `src/index.ts` — drop `CalmConnection`/`ICalmConnectionOptions`/`serviceRoutes` re-exports; add `calmErrorFromBody`
- Modify: `src/__tests__/helpers/test-connection.ts` — replace `new CalmConnection(...)` with a local `MockCalmConnection`
- Delete: `src/__tests__/unit/connection/CalmConnection.test.ts`
- Delete: `src/__tests__/unit/connection/serviceRoutes.test.ts`
- Modify: `src/__tests__/unit/connection/parseCalmError.test.ts` (if present) — retarget to `calmErrorFromBody`
- Modify: `package.json` — version `0.4.0`; drop `axios` from deps **only if** no other file imports it (verify first)

### Part B — `mcp-calm-server` (0.4.0, breaking)

- Create: `src/server/connection/serviceRoutes.ts` (moved from client)
- Create: `src/server/connection/AbstractCalmConnection.ts`
- Create: `src/server/connection/SandboxCalmConnection.ts`
- Create: `src/server/connection/OAuth2CalmConnection.ts`
- Create: `src/server/connection/XsuaaRefresher.ts` (extracted from `buildClient.ts`)
- Create: `src/server/connection/createCalmConnection.ts`
- Create: `src/server/connection/index.ts` (public re-export)
- Modify: `src/server/buildClient.ts` — collapse to one factory call
- Modify: `src/server/config.ts` — doc comment only (behavior already verbatim)
- Modify: `package.json` — `0.4.0`; bump peer `@mcp-abap-adt/calm-client` to `^0.4.0`; add `dependencies: { dotenv }`; add `./connection` export
- Modify: `.env.example` — `/api` suffix note
- Modify: `CLAUDE.md` — new pitfall entry
- Create: `src/server/connection/__tests__/connection.test.ts`
- Modify: `src/__tests__/integration/processMonitoring.oauth2.test.ts` — accept 403|404
- Modify: integration `.env` (local, untracked) — append `/api` to `CALM_BASE_URL`

---

# PART A — `mcp-calm-client` 0.4.0

All Part A steps run with cwd `/home/okyslytsia/prj/mcp-calm-client`.

## Task A0: Branch + baseline

- [ ] **Step 1: Create the working branch**

```bash
cd /home/okyslytsia/prj/mcp-calm-client
git checkout -b feat/connection-out-of-client
```

- [ ] **Step 2: Confirm baseline is green**

Run: `npm run build && npm test`
Expected: build + all unit tests PASS (this is the pre-change baseline).

- [ ] **Step 3: Verify axios has no consumer outside connection/test code**

Run: `grep -rln "from 'axios'\|require('axios')" src/ | grep -v CalmConnection.ts | grep -v __tests__`
Expected: only `src/core/feature/types.ts` (it imports an axios *type*, verify) — note the result; it decides whether `axios` can leave `dependencies` in Task A5.

## Task A1: Split the transport-agnostic error helper

**Files:**
- Modify: `src/connection/parseCalmError.ts`
- Test: `src/__tests__/unit/connection/parseCalmError.test.ts`

- [ ] **Step 1: Write the failing test for `calmErrorFromBody`**

Replace the body of `src/__tests__/unit/connection/parseCalmError.test.ts` (create if absent) with:

```ts
import { CalmApiError } from '../../../errors/CalmApiError';
import { calmErrorFromBody } from '../../../connection/parseCalmError';

describe('calmErrorFromBody', () => {
  it('maps an OData error envelope to a CalmApiError(ODATA_ERROR)', () => {
    const body = { error: { code: 'SY/530', message: 'boom' } };
    const err = calmErrorFromBody(400, body);
    expect(err).toBeInstanceOf(CalmApiError);
    expect(err.code).toBe('ODATA_ERROR');
    expect(err.status).toBe(400);
    expect(err.serviceCode).toBe('SY/530');
  });

  it('maps a plain string body to a CalmApiError(HTTP_ERROR)', () => {
    const err = calmErrorFromBody(404, 'Not Found');
    expect(err.code).toBe('HTTP_ERROR');
    expect(err.status).toBe(404);
    expect(err.message).toContain('404');
  });

  it('stringifies a non-OData object body for HTTP_ERROR', () => {
    const err = calmErrorFromBody(500, { message: 'x', status: 500 });
    expect(err.code).toBe('HTTP_ERROR');
    expect(err.status).toBe(500);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest src/__tests__/unit/connection/parseCalmError.test.ts -v`
Expected: FAIL — `calmErrorFromBody` is not exported yet.

- [ ] **Step 3: Refactor `parseCalmError.ts`**

Replace the full contents of `src/connection/parseCalmError.ts` with:

```ts
import { CalmApiError } from '../errors/CalmApiError';
import type { IODataErrorResponse } from '../odata/ODataCollection';

function hasODataErrorShape(data: unknown): data is IODataErrorResponse {
  if (typeof data !== 'object' || data === null) return false;
  const err = (data as { error?: unknown }).error;
  if (typeof err !== 'object' || err === null) return false;
  const d = err as { code?: unknown; message?: unknown };
  return typeof d.code === 'string' && typeof d.message === 'string';
}

/**
 * Build a `CalmApiError` from an already-extracted HTTP status and a
 * parsed response body. Transport-agnostic: works for fetch, axios, or
 * any client that can hand over (status, body).
 */
export function calmErrorFromBody(status: number, data: unknown): CalmApiError {
  if (hasODataErrorShape(data)) {
    return CalmApiError.fromOData(status, data.error, data);
  }
  const body = typeof data === 'string' ? data : JSON.stringify(data ?? '');
  return CalmApiError.fromHttp(status, body);
}
```

(Note: this removes `toCalmApiError`. Its only consumer, `CalmConnection.ts`, is deleted in Task A2.)

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx jest src/__tests__/unit/connection/parseCalmError.test.ts -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/connection/parseCalmError.ts src/__tests__/unit/connection/parseCalmError.test.ts
git commit -m "refactor(errors): transport-agnostic calmErrorFromBody; drop axios toCalmApiError"
```

## Task A2: Delete `CalmConnection` and `serviceRoutes`

**Files:**
- Delete: `src/connection/CalmConnection.ts`
- Delete: `src/connection/serviceRoutes.ts`
- Delete: `src/__tests__/unit/connection/CalmConnection.test.ts`
- Delete: `src/__tests__/unit/connection/serviceRoutes.test.ts`

- [ ] **Step 1: Delete the four files**

```bash
git rm src/connection/CalmConnection.ts \
       src/connection/serviceRoutes.ts \
       src/__tests__/unit/connection/CalmConnection.test.ts \
       src/__tests__/unit/connection/serviceRoutes.test.ts
```

- [ ] **Step 2: Confirm nothing else references them**

Run: `grep -rln "CalmConnection\b\|serviceRoutes\|DEFAULT_CALM_SERVICE_ROUTES" src/ | grep -v __tests__/helpers`
Expected: only `src/index.ts` (fixed in Task A3) and possibly `src/__tests__/helpers/test-connection.ts` (fixed in Task A4). If any `src/core/**` file appears, STOP — it should import `ICalmConnection` from interfaces, not the class; investigate before continuing.

- [ ] **Step 3: Commit**

```bash
git commit -m "refactor(connection): remove CalmConnection + serviceRoutes (moving to calm-server)"
```

## Task A3: Fix `src/index.ts` exports

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Inspect current exports around connection**

Run: `grep -n "CalmConnection\|ICalmConnectionOptions\|serviceRoutes\|DEFAULT_CALM_SERVICE_ROUTES\|CalmServiceRouteMap\|toCalmApiError\|CalmApiError\|parseCalmError" src/index.ts`
Expected: lines re-exporting `CalmConnection`, `ICalmConnectionOptions`, the service-routes symbols, and `CalmApiError`.

- [ ] **Step 2: Edit `src/index.ts`**

Remove every export line for: `CalmConnection`, `CalmAuthMode`, `ICalmConnectionOptions`, `DEFAULT_CALM_SERVICE_ROUTES`, `CalmServiceRouteMap` (these came from the two deleted files). In the errors/connection export group, add `calmErrorFromBody`. Keep `CalmApiError` and `CalmApiErrorCode`. Example resulting block (adapt to actual file shape):

```ts
// ─── Errors ─────────────────────────────────────────────────────────────────
export { CalmApiError } from './errors/CalmApiError';
export type { CalmApiErrorCode } from './errors/codes';
export { calmErrorFromBody } from './connection/parseCalmError';
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: PASS — no dangling references to deleted symbols. If TS complains about a missing export still referenced internally, fix that reference.

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "refactor(api): drop connection re-exports; export calmErrorFromBody"
```

## Task A4: Replace test connection helper with a `MockCalmConnection`

**Files:**
- Modify: `src/__tests__/helpers/test-connection.ts`

- [ ] **Step 1: Inspect the current helper**

Run: `cat src/__tests__/helpers/test-connection.ts`
Expected: it constructs `new CalmConnection({...})` and likely returns it for unit tests that exercise `core/*` resources.

- [ ] **Step 2: Rewrite the helper to a pure `ICalmConnection` mock**

Replace the file with a mock that implements the interface and lets tests stub responses. Preserve the helper's existing exported function name/signature (check Step 1 output; the example below assumes it exported `makeTestConnection()` returning an `ICalmConnection` plus a way to enqueue responses — adapt names to match the real file):

```ts
import type {
  CalmService,
  ICalmConnection,
  ICalmRequestOptions,
  ICalmResponse,
} from '@mcp-abap-adt/interfaces';

export interface IMockCall {
  options: ICalmRequestOptions;
}

/**
 * Minimal in-memory ICalmConnection for unit tests. Enqueue responses
 * with `pushResponse`; every `makeRequest` shifts the next one. Records
 * calls in `calls` for assertions.
 */
export class MockCalmConnection implements ICalmConnection {
  readonly calls: IMockCall[] = [];
  private readonly queue: ICalmResponse[] = [];
  constructor(private readonly baseUrl = 'https://mock.calm.local') {}

  pushResponse<T = unknown>(data: T, status = 200): void {
    this.queue.push({
      data,
      status,
      statusText: status === 200 ? 'OK' : String(status),
      headers: {},
    } as ICalmResponse);
  }

  async connect(): Promise<void> {}
  async getBaseUrl(): Promise<string> {
    return this.baseUrl;
  }
  async getServiceUrl(service: CalmService): Promise<string> {
    return `${this.baseUrl}/${service}`;
  }
  async makeRequest<T = unknown, D = unknown>(
    options: ICalmRequestOptions,
  ): Promise<ICalmResponse<T, D>> {
    this.calls.push({ options });
    const next = this.queue.shift();
    if (!next) {
      throw new Error(
        `MockCalmConnection: no queued response for ${options.method} ${options.url}`,
      );
    }
    return next as ICalmResponse<T, D>;
  }
}

/** Backwards-compatible factory matching the previous helper name. */
export function makeTestConnection(): MockCalmConnection {
  return new MockCalmConnection();
}
```

If existing `core/*` tests relied on the old helper enqueuing via axios-mock (e.g. `nock`/`axios-mock-adapter`), update those tests to call `conn.pushResponse(...)` instead. Inspect failures in Step 3 and adapt each.

- [ ] **Step 3: Run the unit suite**

Run: `npm test`
Expected: PASS. If `core/*` tests fail because they assumed axios-level mocking, convert them to enqueue via `pushResponse` and assert on `conn.calls[i].options`. Iterate until green.

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/
git commit -m "test: replace axios-backed test-connection with MockCalmConnection"
```

## Task A5: Drop `axios` dependency if unused, bump version

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Re-check axios consumers after the deletions**

Run: `grep -rln "from 'axios'\|require('axios')" src/`
Expected: ideally empty. If only `src/core/feature/types.ts` remains and it uses `import type { ... } from 'axios'` purely for a type, replace that type with a local equivalent or `unknown`, then re-run. If axios is genuinely still imported at runtime anywhere, **leave it in `dependencies`** and skip the removal.

- [ ] **Step 2: Edit `package.json`**

Set `"version": "0.4.0"`. If Step 1 confirmed axios is unused, remove `"axios"` from `dependencies`. Leave everything else.

- [ ] **Step 3: Clean install + full gate**

```bash
rm -rf node_modules package-lock.json && npm install
npm run build && npm test
```
Expected: build PASS, all tests PASS, no `Cannot find module 'axios'` errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: 0.4.0 — drop axios runtime dep (connection moved to calm-server)"
```

## Task A6: PR, merge, tag — ready for publish

- [ ] **Step 1: Push and open PR**

```bash
git push -u origin feat/connection-out-of-client
gh pr create --fill --title "feat: connection moves to calm-server (0.4.0, breaking)"
```

- [ ] **Step 2: After review + merge to main, tag**

```bash
git checkout main && git pull
git tag v0.4.0 && git push origin v0.4.0
```

- [ ] **Step 3: Hand off to maintainer for `npm publish`**

Tell the user: "calm-client `v0.4.0` tagged and ready. Run `npm publish` when ready, then I'll start Part B." Do not run `npm publish`.

---

# PART B — `mcp-calm-server` 0.4.0

All Part B steps run with cwd `/home/okyslytsia/prj/mcp-calm-server`.

**Local linking for development before calm-client@0.4.0 is on the registry:** use `npm link` so the local 0.4.0 build is resolvable **without touching `package.json` or `package-lock.json`**. Never commit a `file:../mcp-calm-client` path — it leaks a machine-local path into release metadata.

## Task B0: Branch + link new client

- [ ] **Step 1: Branch**

```bash
cd /home/okyslytsia/prj/mcp-calm-server
git checkout -b feat/own-connection
```

- [ ] **Step 2: Link the local client build (no manifest changes)**

```bash
npm --prefix ../mcp-calm-client run build      # ensure 0.4.0 dist is fresh
npm --prefix ../mcp-calm-client link           # register the local package globally
npm link @mcp-abap-adt/calm-client             # symlink it into this repo's node_modules
```
`npm link` creates a symlink in `node_modules` and does **not** modify
`package.json`/`package-lock.json`. Confirm `git status` shows no
change to either manifest after linking.

- [ ] **Step 3: Confirm the new client surface is present**

Run: `grep -rl "calmErrorFromBody" node_modules/@mcp-abap-adt/calm-client/dist/`
Expected: at least one match (the new export exists in the linked build).

## Task B1: Move `serviceRoutes` into the server

**Files:**
- Create: `src/server/connection/serviceRoutes.ts`

- [ ] **Step 1: Create the file**

```ts
import type { CalmService } from '@mcp-abap-adt/interfaces';

export type CalmServiceRouteMap = Record<CalmService, string>;

/**
 * Cloud ALM service route suffixes appended to `baseUrl` verbatim.
 *
 * Full URL = `joinUrl(baseUrl, serviceRoute)`. `baseUrl` already
 * includes any tenant mount prefix (for OAuth2 tenants that is the
 * `/api` that SAP puts in `endpoints.Api`; for sandbox it is the
 * `/SAPCALM` suffix). The connection layer does NOT inject a prefix.
 *
 * Seeded from `sap-cloud-alm-odata-mcp/src/config.rs`; verify against
 * a live tenant. Override per-connection via the `serviceRoutes` ctor
 * option.
 */
export const DEFAULT_CALM_SERVICE_ROUTES: CalmServiceRouteMap = {
  features: '/calm-features/v1',
  documents: '/calm-documents/v1',
  tasks: '/calm-tasks/v1',
  projects: '/calm-projects/v1',
  testManagement: '/calm-testmanagement/v1',
  hierarchy: '/calm-processhierarchy/v1',
  analytics: '/calm-analytics/v1/odata/v4/analytics',
  processMonitoring: '/calm-processmonitoring/v1',
  logs: '/calm-logs/v1',
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/server/connection/serviceRoutes.ts
git commit -m "feat(connection): add serviceRoutes map (moved from calm-client)"
```

## Task B2: `AbstractCalmConnection` (fetch transport, TDD)

**Files:**
- Create: `src/server/connection/AbstractCalmConnection.ts`
- Test: `src/server/connection/__tests__/connection.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/server/connection/__tests__/connection.test.ts`:

```ts
import { CalmApiError } from '@mcp-abap-adt/calm-client';
import { AbstractCalmConnection } from '../AbstractCalmConnection';

// Concrete test double exposing protected hooks with a no-auth header.
class TestConn extends AbstractCalmConnection {
  protected async attachAuth(): Promise<Record<string, string>> {
    return { 'X-Test-Auth': 'yes' };
  }
}

const okJson = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('AbstractCalmConnection (fetch)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('builds service URL by pure concatenation, no /api injection', async () => {
    const conn = new TestConn({ baseUrl: 'https://t.alm.cloud.sap/api' });
    expect(await conn.getServiceUrl('features')).toBe(
      'https://t.alm.cloud.sap/api/calm-features/v1',
    );
  });

  it('GETs through fetch and returns parsed JSON in ICalmResponse shape', async () => {
    const spy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okJson({ value: [1, 2] }));
    const conn = new TestConn({ baseUrl: 'https://t.alm.cloud.sap/api' });
    const res = await conn.makeRequest<{ value: number[] }>({
      service: 'features',
      url: '/Features',
      method: 'GET',
    });
    expect(res.status).toBe(200);
    expect(res.data.value).toEqual([1, 2]);
    const calledUrl = (spy.mock.calls[0][0] as string) ?? '';
    expect(calledUrl).toBe(
      'https://t.alm.cloud.sap/api/calm-features/v1/Features',
    );
    expect((spy.mock.calls[0][1] as RequestInit).headers).toMatchObject({
      'X-Test-Auth': 'yes',
    });
  });

  it('throws CalmApiError(HTTP_ERROR) on a 404 with text body', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('Not Found', { status: 404 }));
    const conn = new TestConn({ baseUrl: 'https://t.alm.cloud.sap/api' });
    await expect(
      conn.makeRequest({ service: 'tasks', url: '/tasks', method: 'GET' }),
    ).rejects.toMatchObject({ name: 'CalmApiError', code: 'HTTP_ERROR', status: 404 });
  });

  it('throws CalmApiError(ODATA_ERROR) on a 400 OData envelope', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        okJson({ error: { code: 'X/1', message: 'bad' } }, 400),
      );
    const conn = new TestConn({ baseUrl: 'https://t.alm.cloud.sap/api' });
    await expect(
      conn.makeRequest({ service: 'tasks', url: '/tasks', method: 'GET' }),
    ).rejects.toMatchObject({ code: 'ODATA_ERROR', status: 400 });
  });

  it('serializes object params into the query string', async () => {
    const spy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okJson({ value: [] }));
    const conn = new TestConn({ baseUrl: 'https://t.alm.cloud.sap/api' });
    await conn.makeRequest({
      service: 'features',
      url: '/Features',
      method: 'GET',
      params: { $top: 1, projectId: 'abc' },
    });
    const url = spy.mock.calls[0][0] as string;
    expect(url).toContain('?');
    expect(url).toContain('%24top=1');
    expect(url).toContain('projectId=abc');
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest src/server/connection/__tests__/connection.test.ts -v`
Expected: FAIL — `AbstractCalmConnection` does not exist.

- [ ] **Step 3: Implement `AbstractCalmConnection.ts`**

```ts
import {
  CalmApiError,
  calmErrorFromBody,
} from '@mcp-abap-adt/calm-client';
import type {
  CalmService,
  ICalmConnection,
  ICalmRequestOptions,
  ICalmResponse,
} from '@mcp-abap-adt/interfaces';
import {
  type CalmServiceRouteMap,
  DEFAULT_CALM_SERVICE_ROUTES,
} from './serviceRoutes';

export interface IAbstractCalmConnectionOptions {
  baseUrl: string;
  defaultTimeout?: number;
  serviceRoutes?: Partial<CalmServiceRouteMap>;
  defaultHeaders?: Record<string, string>;
}

function trimTrailingSlash(v: string): string {
  return v.endsWith('/') ? v.slice(0, -1) : v;
}
function trimLeadingSlash(v: string): string {
  return v.startsWith('/') ? v.slice(1) : v;
}
function joinUrl(base: string, path: string): string {
  if (!path) return trimTrailingSlash(base);
  return `${trimTrailingSlash(base)}/${trimLeadingSlash(path)}`;
}
function toQueryString(params: unknown): string {
  if (!params || typeof params !== 'object') return '';
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
    if (v === undefined || v === null) continue;
    usp.append(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

/**
 * Shared fetch-based transport for Cloud ALM. Subclasses provide
 * `attachAuth()` and may override `onAuthFailure()`. `baseUrl` is used
 * verbatim — NO prefix injection.
 */
export abstract class AbstractCalmConnection implements ICalmConnection {
  protected readonly baseUrl: string;
  protected readonly defaultTimeout: number;
  protected readonly defaultHeaders: Record<string, string>;
  protected readonly serviceRoutes: CalmServiceRouteMap;

  constructor(options: IAbstractCalmConnectionOptions) {
    this.baseUrl = trimTrailingSlash(options.baseUrl);
    this.defaultTimeout = options.defaultTimeout ?? 30_000;
    this.defaultHeaders = { Accept: 'application/json', ...options.defaultHeaders };
    this.serviceRoutes = { ...DEFAULT_CALM_SERVICE_ROUTES, ...options.serviceRoutes };
  }

  /** Subclass: return auth headers for a request. */
  protected abstract attachAuth(): Promise<Record<string, string>>;

  /**
   * Subclass hook on 401/403. Return true to retry once. Default: no
   * retry.
   */
  protected async onAuthFailure(_status: number): Promise<boolean> {
    return false;
  }

  async connect(): Promise<void> {}

  async getBaseUrl(): Promise<string> {
    return this.baseUrl;
  }

  async getServiceUrl(service: CalmService): Promise<string> {
    return joinUrl(this.baseUrl, this.serviceRoutes[service]);
  }

  async makeRequest<T = unknown, D = unknown>(
    options: ICalmRequestOptions,
  ): Promise<ICalmResponse<T, D>> {
    const base = options.service
      ? await this.getServiceUrl(options.service)
      : this.baseUrl;
    const url = joinUrl(base, options.url) + toQueryString(options.params);

    try {
      return await this.execute<T, D>(url, options);
    } catch (err) {
      const status = err instanceof CalmApiError ? err.status : undefined;
      if (status !== undefined && (await this.onAuthFailure(status))) {
        // Retry once. The retry's own errors (network, abort, HTTP) go
        // through the same normalization — never escape as a raw error.
        try {
          return await this.execute<T, D>(url, options);
        } catch (retryErr) {
          throw this.normalizeError(retryErr);
        }
      }
      throw this.normalizeError(err);
    }
  }

  private normalizeError(err: unknown): CalmApiError {
    if (err instanceof CalmApiError) return err;
    return CalmApiError.fromNetwork(
      err,
      err instanceof Error ? err.message : String(err),
    );
  }

  private async execute<T, D>(
    url: string,
    options: ICalmRequestOptions,
  ): Promise<ICalmResponse<T, D>> {
    const auth = await this.attachAuth();
    const headers = { ...this.defaultHeaders, ...auth, ...options.headers };
    const init: RequestInit = {
      method: options.method,
      headers,
      signal: AbortSignal.timeout(options.timeout ?? this.defaultTimeout),
    };
    if (options.data !== undefined) {
      init.body =
        typeof options.data === 'string'
          ? options.data
          : JSON.stringify(options.data);
      if (!('Content-Type' in headers) && !('content-type' in headers)) {
        (headers as Record<string, string>)['Content-Type'] =
          'application/json';
      }
    }

    const response = await fetch(url, init);
    const raw = await response.text();
    const parsed = raw ? safeJson(raw) : undefined;

    if (!response.ok) {
      throw calmErrorFromBody(response.status, parsed ?? raw);
    }

    const outHeaders: Record<string, string> = {};
    response.headers.forEach((v, k) => {
      outHeaders[k] = v;
    });
    return {
      data: parsed as T,
      status: response.status,
      statusText: response.statusText,
      headers: outHeaders,
    } as ICalmResponse<T, D>;
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx jest src/server/connection/__tests__/connection.test.ts -v`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/server/connection/AbstractCalmConnection.ts src/server/connection/__tests__/connection.test.ts
git commit -m "feat(connection): AbstractCalmConnection on native fetch, verbatim baseUrl"
```

## Task B3: `SandboxCalmConnection` + `OAuth2CalmConnection`

**Files:**
- Create: `src/server/connection/SandboxCalmConnection.ts`
- Create: `src/server/connection/OAuth2CalmConnection.ts`
- Test: append to `src/server/connection/__tests__/connection.test.ts`

- [ ] **Step 1: Write failing tests for the two concrete classes**

Append to `connection.test.ts`:

```ts
import { SandboxCalmConnection } from '../SandboxCalmConnection';
import { OAuth2CalmConnection } from '../OAuth2CalmConnection';
import type { ITokenRefresher } from '@mcp-abap-adt/interfaces';

describe('SandboxCalmConnection', () => {
  afterEach(() => jest.restoreAllMocks());
  it('sends the APIKey header', async () => {
    const spy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ value: [] }), { status: 200 }));
    const conn = new SandboxCalmConnection({
      baseUrl: 'https://sandbox.api.sap.com/SAPCALM',
      apiKey: 'KEY123',
    });
    await conn.makeRequest({ service: 'features', url: '/Features', method: 'GET' });
    expect((spy.mock.calls[0][1] as RequestInit).headers).toMatchObject({
      APIKey: 'KEY123',
    });
  });
});

describe('OAuth2CalmConnection', () => {
  afterEach(() => jest.restoreAllMocks());

  const refresher = (token = 'tok'): ITokenRefresher & { refreshes: number } => {
    const r = {
      refreshes: 0,
      async getToken() {
        return token;
      },
      async refreshToken() {
        this.refreshes += 1;
        return `${token}-r${this.refreshes}`;
      },
    };
    return r;
  };

  it('sends a Bearer token from the refresher', async () => {
    const spy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ value: [] }), { status: 200 }));
    const conn = new OAuth2CalmConnection({
      baseUrl: 'https://t.alm.cloud.sap/api',
      tokenRefresher: refresher('abc'),
    });
    await conn.makeRequest({ service: 'tasks', url: '/tasks', method: 'GET' });
    expect((spy.mock.calls[0][1] as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer abc',
    });
  });

  it('refreshes once and retries on a 401', async () => {
    const r = refresher('abc');
    const spy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('nope', { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ value: [] }), { status: 200 }));
    const conn = new OAuth2CalmConnection({
      baseUrl: 'https://t.alm.cloud.sap/api',
      tokenRefresher: r,
    });
    const res = await conn.makeRequest({ service: 'tasks', url: '/tasks', method: 'GET' });
    expect(res.status).toBe(200);
    expect(r.refreshes).toBe(1);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('propagates a non-auth 404 as CalmApiError without retry', async () => {
    const r = refresher('abc');
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('gone', { status: 404 }));
    const conn = new OAuth2CalmConnection({
      baseUrl: 'https://t.alm.cloud.sap/api',
      tokenRefresher: r,
    });
    await expect(
      conn.makeRequest({ service: 'tasks', url: '/tasks', method: 'GET' }),
    ).rejects.toMatchObject({ code: 'HTTP_ERROR', status: 404 });
    expect(r.refreshes).toBe(0);
  });

  it('normalizes a network failure ON THE RETRY into CalmApiError(NETWORK)', async () => {
    const r = refresher('abc');
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('nope', { status: 401 }))
      .mockRejectedValueOnce(new TypeError('socket hang up'));
    const conn = new OAuth2CalmConnection({
      baseUrl: 'https://t.alm.cloud.sap/api',
      tokenRefresher: r,
    });
    await expect(
      conn.makeRequest({ service: 'tasks', url: '/tasks', method: 'GET' }),
    ).rejects.toMatchObject({ name: 'CalmApiError', code: 'NETWORK' });
    expect(r.refreshes).toBe(1);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx jest src/server/connection/__tests__/connection.test.ts -v`
Expected: FAIL — the two concrete classes don't exist.

- [ ] **Step 3: Implement `SandboxCalmConnection.ts`**

```ts
import {
  AbstractCalmConnection,
  type IAbstractCalmConnectionOptions,
} from './AbstractCalmConnection';

export interface ISandboxCalmConnectionOptions
  extends IAbstractCalmConnectionOptions {
  apiKey: string;
}

export class SandboxCalmConnection extends AbstractCalmConnection {
  private readonly apiKey: string;
  constructor(options: ISandboxCalmConnectionOptions) {
    super(options);
    this.apiKey = options.apiKey;
  }
  protected async attachAuth(): Promise<Record<string, string>> {
    return { APIKey: this.apiKey };
  }
}
```

- [ ] **Step 4: Implement `OAuth2CalmConnection.ts`**

```ts
import type { ITokenRefresher } from '@mcp-abap-adt/interfaces';
import {
  AbstractCalmConnection,
  type IAbstractCalmConnectionOptions,
} from './AbstractCalmConnection';

export interface IOAuth2CalmConnectionOptions
  extends IAbstractCalmConnectionOptions {
  tokenRefresher: ITokenRefresher;
}

export class OAuth2CalmConnection extends AbstractCalmConnection {
  private readonly tokenRefresher: ITokenRefresher;
  constructor(options: IOAuth2CalmConnectionOptions) {
    super(options);
    this.tokenRefresher = options.tokenRefresher;
  }

  async connect(): Promise<void> {
    await this.tokenRefresher.getToken();
  }

  protected async attachAuth(): Promise<Record<string, string>> {
    const token = await this.tokenRefresher.getToken();
    return { Authorization: `Bearer ${token}` };
  }

  protected async onAuthFailure(status: number): Promise<boolean> {
    if (status === 401 || status === 403) {
      await this.tokenRefresher.refreshToken();
      return true;
    }
    return false;
  }
}
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `npx jest src/server/connection/__tests__/connection.test.ts -v`
Expected: PASS (all sandbox + oauth2 cases).

> Note: the 401-retry test relies on `attachAuth()` being called again
> inside `execute()` on the retry path — `OAuth2CalmConnection` reads a
> fresh token each `attachAuth()`, so after `refreshToken()` the retry
> picks up the new token. Confirm the retry actually re-invokes
> `execute` (it does in `AbstractCalmConnection.makeRequest`).

- [ ] **Step 6: Commit**

```bash
git add src/server/connection/SandboxCalmConnection.ts src/server/connection/OAuth2CalmConnection.ts src/server/connection/__tests__/connection.test.ts
git commit -m "feat(connection): Sandbox + OAuth2 concrete connections with one-shot auth retry"
```

## Task B4: Extract `XsuaaRefresher` into its own file

**Files:**
- Create: `src/server/connection/XsuaaRefresher.ts`
- Modify: `src/server/buildClient.ts` (remove the inline class — done in B6)

- [ ] **Step 1: Create `XsuaaRefresher.ts`**

Move the inline class verbatim from `buildClient.ts` (it already uses fetch):

```ts
import type { ITokenRefresher } from '@mcp-abap-adt/interfaces';

/**
 * Minimal XSUAA `client_credentials` refresher — sufficient for
 * standalone-mode servers without a shared auth-broker. Caches the
 * token until `refreshToken()` is called. Consumers running
 * `@mcp-abap-adt/auth-broker` can pass their own ITokenRefresher to
 * the connection factory instead.
 */
export class XsuaaRefresher implements ITokenRefresher {
  private cached?: string;

  constructor(
    private readonly uaaUrl: string,
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  async getToken(): Promise<string> {
    if (!this.cached) return this.refreshToken();
    return this.cached;
  }

  async refreshToken(): Promise<string> {
    const url = `${this.uaaUrl.replace(/\/$/, '')}/oauth/token`;
    const basic = Buffer.from(
      `${this.clientId}:${this.clientSecret}`,
    ).toString('base64');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `XSUAA token request failed: ${response.status} ${response.statusText} — ${body.slice(0, 200)}`,
      );
    }
    const json = (await response.json()) as { access_token?: string };
    if (!json.access_token) {
      throw new Error('XSUAA token response missing access_token');
    }
    this.cached = json.access_token;
    return this.cached;
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: PASS (file compiles; `buildClient.ts` still has its own copy at this point — duplicate class names live in different modules, fine).

- [ ] **Step 3: Commit**

```bash
git add src/server/connection/XsuaaRefresher.ts
git commit -m "feat(connection): extract XsuaaRefresher into its own module"
```

## Task B5: `createCalmConnection` factory + `index.ts`

**Files:**
- Create: `src/server/connection/createCalmConnection.ts`
- Create: `src/server/connection/index.ts`
- Test: append to `src/server/connection/__tests__/connection.test.ts`

- [ ] **Step 1: Write failing tests for the factory**

Append to `connection.test.ts`:

```ts
import { createCalmConnection } from '../createCalmConnection';
import type { ICalmServerConfig } from '../../config';

describe('createCalmConnection', () => {
  it('returns an OAuth2 connection for oauth2 mode', async () => {
    const cfg: ICalmServerConfig = {
      mode: 'oauth2',
      baseUrl: 'https://t.alm.cloud.sap/api',
      uaaUrl: 'https://u.auth',
      uaaClientId: 'id',
      uaaClientSecret: 'secret',
      timeoutMs: 30_000,
    };
    const conn = createCalmConnection(cfg);
    expect(await conn.getServiceUrl('features')).toBe(
      'https://t.alm.cloud.sap/api/calm-features/v1',
    );
  });

  it('returns a Sandbox connection for sandbox mode', async () => {
    const cfg: ICalmServerConfig = {
      mode: 'sandbox',
      baseUrl: 'https://sandbox.api.sap.com/SAPCALM',
      apiKey: 'KEY',
      timeoutMs: 30_000,
    };
    const conn = createCalmConnection(cfg);
    expect(await conn.getServiceUrl('logs')).toBe(
      'https://sandbox.api.sap.com/SAPCALM/calm-logs/v1',
    );
  });

  it('honours an injected tokenRefresher override', async () => {
    const calls: string[] = [];
    const cfg: ICalmServerConfig = {
      mode: 'oauth2',
      baseUrl: 'https://t.alm.cloud.sap/api',
      uaaUrl: 'https://u.auth',
      uaaClientId: 'id',
      uaaClientSecret: 'secret',
      timeoutMs: 30_000,
    };
    const conn = createCalmConnection(cfg, {
      tokenRefresher: {
        async getToken() {
          calls.push('get');
          return 'injected';
        },
        async refreshToken() {
          return 'injected';
        },
      },
    });
    const spy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ value: [] }), { status: 200 }));
    await conn.makeRequest({ service: 'tasks', url: '/tasks', method: 'GET' });
    expect(calls).toContain('get');
    expect((spy.mock.calls[0][1] as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer injected',
    });
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx jest src/server/connection/__tests__/connection.test.ts -v`
Expected: FAIL — `createCalmConnection` not found.

- [ ] **Step 3: Implement `createCalmConnection.ts`**

```ts
import type {
  ICalmConnection,
  ITokenRefresher,
} from '@mcp-abap-adt/interfaces';
import type { ICalmServerConfig } from '../config';
import { OAuth2CalmConnection } from './OAuth2CalmConnection';
import { SandboxCalmConnection } from './SandboxCalmConnection';
import { XsuaaRefresher } from './XsuaaRefresher';

export interface ICreateCalmConnectionOverrides {
  /** Bring-your-own refresher; overrides the default XsuaaRefresher. */
  tokenRefresher?: ITokenRefresher;
}

export function createCalmConnection(
  config: ICalmServerConfig,
  overrides: ICreateCalmConnectionOverrides = {},
): ICalmConnection {
  if (config.mode === 'oauth2') {
    const tokenRefresher =
      overrides.tokenRefresher ??
      new XsuaaRefresher(
        config.uaaUrl as string,
        config.uaaClientId as string,
        config.uaaClientSecret as string,
      );
    return new OAuth2CalmConnection({
      baseUrl: config.baseUrl,
      tokenRefresher,
      defaultTimeout: config.timeoutMs,
    });
  }
  if (config.mode === 'sandbox') {
    return new SandboxCalmConnection({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey as string,
      defaultTimeout: config.timeoutMs,
    });
  }
  throw new Error(
    `Unsupported CALM mode: ${(config as { mode: string }).mode}`,
  );
}
```

- [ ] **Step 4: Create `index.ts`**

```ts
export { AbstractCalmConnection } from './AbstractCalmConnection';
export type { IAbstractCalmConnectionOptions } from './AbstractCalmConnection';
export { SandboxCalmConnection } from './SandboxCalmConnection';
export type { ISandboxCalmConnectionOptions } from './SandboxCalmConnection';
export { OAuth2CalmConnection } from './OAuth2CalmConnection';
export type { IOAuth2CalmConnectionOptions } from './OAuth2CalmConnection';
export { XsuaaRefresher } from './XsuaaRefresher';
export {
  createCalmConnection,
  type ICreateCalmConnectionOverrides,
} from './createCalmConnection';
export {
  DEFAULT_CALM_SERVICE_ROUTES,
  type CalmServiceRouteMap,
} from './serviceRoutes';
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `npx jest src/server/connection/__tests__/connection.test.ts -v`
Expected: PASS (all factory cases).

- [ ] **Step 6: Commit**

```bash
git add src/server/connection/createCalmConnection.ts src/server/connection/index.ts src/server/connection/__tests__/connection.test.ts
git commit -m "feat(connection): createCalmConnection factory + public index"
```

## Task B6: Rewire `buildClient.ts`

**Files:**
- Modify: `src/server/buildClient.ts`

- [ ] **Step 1: Replace the whole file**

```ts
import { CalmClient } from '@mcp-abap-adt/calm-client';
import { createCalmConnection } from './connection/createCalmConnection';
import type { ICalmServerConfig } from './config';

/**
 * Build a ready-to-use `CalmClient` from an `ICalmServerConfig`.
 * Connection construction (auth strategy, transport, URL assembly)
 * lives in `./connection`. Consumers that need a custom connection
 * build their own `ICalmConnection` and call `new CalmClient(conn)`
 * directly, skipping this helper.
 */
export function buildCalmClient(config: ICalmServerConfig): CalmClient {
  return new CalmClient(createCalmConnection(config));
}
```

- [ ] **Step 2: Confirm no lingering imports of the old client `CalmConnection` class**

Run: `rg -n "\bCalmConnection\b" src --glob '!src/server/connection/**'`
Expected: empty. Use a **word-boundary** match for the exact class name
`CalmConnection` — a plain substring grep would false-positive on
`createCalmConnection`, `ICalmConnection`, and the doc comments in
`buildClient.ts`. The class `CalmConnection` (from calm-client) must
have zero remaining references.

- [ ] **Step 3: Build + full unit suite**

Run: `npm run build && npx jest src/server src/__tests__/unit 2>/dev/null || npx jest --selectProjects unit 2>/dev/null || npm test`
Expected: build PASS; connection unit tests PASS. (Integration tests are env-gated and stay skipped without secrets.)

- [ ] **Step 4: Commit**

```bash
git add src/server/buildClient.ts
git commit -m "refactor(server): buildClient delegates to createCalmConnection factory"
```

## Task B7: `package.json` — version, deps, exports

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Edit the manifest**

- Set `"version": "0.4.0"`.
- Under `peerDependencies`, set `"@mcp-abap-adt/calm-client": "^0.4.0"`.
- Add a top-level `dependencies` block (it does not exist yet):

```jsonc
"dependencies": {
  "dotenv": "^17.3.1"
}
```

- Remove `"dotenv"` from `devDependencies` (it moved to `dependencies`).
- Add the `./connection` export to the existing `exports` map (keep `"default"` style):

```jsonc
"./connection": {
  "types": "./dist/server/connection/index.d.ts",
  "default": "./dist/server/connection/index.js"
}
```

- [ ] **Step 2: Build + test against the linked client**

```bash
npm run build && npm test
```
Expected: build PASS, unit tests PASS. The linked client (Task B0,
`npm link`) supplies the 0.4.0 surface; `package.json` references only
the registry range `^0.4.0`. Do **not** `rm -rf node_modules` here — it
would drop the symlink; if you must reinstall, re-run the `npm link`
step from B0 afterward.

- [ ] **Step 3: Verify the `./connection` subpath resolves**

Run: `node -e "console.log(Object.keys(require('./dist/server/connection/index.js')))"`
Expected: prints the exported names (`AbstractCalmConnection`, `SandboxCalmConnection`, `OAuth2CalmConnection`, `XsuaaRefresher`, `createCalmConnection`, `DEFAULT_CALM_SERVICE_ROUTES`).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "build(0.4.0): peer calm-client@^0.4.0, dotenv→deps, export ./connection"
```

## Task B8: Docs + integration-test expectation

**Files:**
- Modify: `.env.example`
- Modify: `CLAUDE.md`
- Modify: `src/__tests__/integration/processMonitoring.oauth2.test.ts`

- [ ] **Step 1: Update `.env.example`**

Change the OAuth2 `CALM_BASE_URL` block to:

```env
# Tenant host for Cloud ALM APIs — paste endpoints.Api from your
# XSUAA service-key VERBATIM, including the /api suffix.
#   Example: https://eu10-004.alm.cloud.sap/api
CALM_BASE_URL=
```

- [ ] **Step 2: Add a `CLAUDE.md` pitfall entry**

Under the existing "Critical pitfall" run of sections, add:

```markdown
## Critical pitfall: CALM_BASE_URL is consumed verbatim

The connection layer (now in `src/server/connection/`) appends service
routes to `CALM_BASE_URL` by plain concatenation — it does **not**
inject `/api`. A tenant service-key's `endpoints.Api` already includes
`/api` (e.g. `https://eu10-004.alm.cloud.sap/api`); copy it 1:1 into
`CALM_BASE_URL`. Sandbox uses `https://sandbox.api.sap.com/SAPCALM` as
before. Putting a bare host (no `/api`) in OAuth2 mode yields 404 on
every call.
```

- [ ] **Step 3: Loosen the live-tenant processMonitoring expectation — but guard URL formation explicitly**

Open `src/__tests__/integration/processMonitoring.oauth2.test.ts`. The
current test expects a successful `rows[]`. A naive "accept 403|404"
change is **insufficient** — a bare-host regression (`CALM_BASE_URL`
without `/api`) also yields 404, so the loosened test would pass for
the exact bug it guards.

Therefore add two independent guards. First, a deterministic
URL-formation assertion that does **not** depend on the live response
(it directly catches the double-/api or missing-/api regression):

Note the existing harness: `ctx` and `describeOAuth2` are imported
from `./_sandbox`; `ctx` is a **function** (`ctx()` builds the handler
context); the tool handler signature is `handler(ctx, args)` — i.e.
`listBusinessProcessesTool.handler(ctx(), { limit: 1 })`. The tool
maps client errors through `mapCalmErrorForTool`, so a 403/404 surfaces
as a **`CalmToolError`** (with a `.status` field), **not** a
`CalmApiError`. Assert accordingly.

```ts
import { CalmToolError } from '../../utils/errorMapping';
import { createCalmConnection } from '../../server/connection/createCalmConnection';
import { readConfig } from '../../server/config';

// ... inside the describeOAuth2 block:

it('forms the processMonitoring URL exactly once with /api', async () => {
  const conn = createCalmConnection(readConfig());
  const url = await conn.getServiceUrl('processMonitoring');
  // Exactly one /api, correct service route, no doubling.
  expect(url).toMatch(
    /^https:\/\/[^/]+\/api\/calm-processmonitoring\/v1$/,
  );
  expect(url).not.toContain('/api/api/');
});
```

Second, the operational-reality assertion for the actual call:

```ts
it('reaches the tenant; succeeds or is scope/deploy-gated (403|404)', async () => {
  try {
    const res = await listBusinessProcessesTool.handler(ctx(), {
      limit: 1,
      offset: 0,
    });
    expect(Array.isArray(res.rows)).toBe(true);
  } catch (err) {
    // Correct URL, but tenant withholds scope (403) or module not
    // deployed (404). The tool re-maps CalmApiError → CalmToolError.
    // Both statuses acceptable; anything else is a regression.
    expect(err).toBeInstanceOf(CalmToolError);
    expect([403, 404]).toContain((err as CalmToolError).status);
  }
});
```

The first test makes the 404 in the second test safe to accept: the
URL is already proven well-formed, so a 404 can only mean "module not
deployed", never "wrong base URL". (Reuse the file's existing
`ctx`/`describeOAuth2` imports from `./_sandbox`; do not re-invent the
harness.)

- [ ] **Step 4: Build + unit test gate (integration stays gated/skipped without secrets)**

Run: `npm run build && npm test`
Expected: build PASS; unit + connection tests PASS; integration suites SKIP (no secrets in CI).

- [ ] **Step 5: Commit**

```bash
git add .env.example CLAUDE.md src/__tests__/integration/processMonitoring.oauth2.test.ts
git commit -m "docs+test: CALM_BASE_URL verbatim; processMonitoring oauth2 accepts 403|404"
```

## Task B9: Live verification, PR, ready for publish

- [ ] **Step 1: Live OAuth2 smoke against the real tenant**

Ensure local `.env` is OAuth2 with `CALM_BASE_URL=https://eu10-004.alm.cloud.sap/api` (the `/api` suffix from the service-key). Then:

```bash
CALM_MODE=oauth2 node scripts/probe-sandbox.mjs 2>&1 | head -40 || true
```
Expected: requests now reach `…/api/calm-*/v1/…` (no double `/api`). Services the client lacks scope for return 403; undeployed modules return 404 — both are now the *honest* signal, not a URL bug. Confirm at least one 403 (e.g. projects) instead of the previous 404.

- [ ] **Step 2: Run the env-gated integration suite against the tenant**

```bash
npm test 2>&1 | tail -30
```
Expected: `processMonitoring.oauth2` passes via the 403|404 branch; no "double /api" 404s; unit + connection green.

- [ ] **Step 3: Confirm the manifest references only the registry range**

```bash
grep -n "calm-client" package.json
git diff --stat package.json package-lock.json
```
Expected: `package.json` shows `"@mcp-abap-adt/calm-client": "^0.4.0"`
under `peerDependencies` and **no** `file:` path anywhere. `git diff`
shows no machine-local path leaked into either manifest. (The local
build is wired via the `npm link` symlink only, which lives in
`node_modules` and is never committed.) Before the maintainer
publishes, they can `npm unlink @mcp-abap-adt/calm-client && npm install`
to validate against the real registry tarball.

- [ ] **Step 4: Push + PR**

```bash
git push -u origin feat/own-connection
gh pr create --fill --title "feat(0.4.0): own the CALM connection; verbatim CALM_BASE_URL (breaking)"
```

- [ ] **Step 5: After merge, tag + hand off**

```bash
git checkout main && git pull
git tag v0.4.0 && git push origin v0.4.0
```
Tell the user: "calm-server `v0.4.0` tagged. Run `npm publish` (maintainer) when ready." Do not run `npm publish`.

---

## Self-Review (filled in at authoring time)

**Spec coverage:**
- Connection moved out of client → Tasks A2, A3 (client) + B1–B6 (server). ✅
- `CALM_BASE_URL` verbatim, no `/api` injection → B2 (`getServiceUrl` pure concat) + B8 docs. ✅
- Native fetch transport → B2. ✅
- Error-contract preservation via `CalmApiError` + transport-agnostic `calmErrorFromBody` → A1 + B2 tests. ✅
- DI seam unchanged (`BaseCalmMcpServer({ calm })`) → no task needed; B6 keeps it; embeddable consumers build their own connection. ✅
- `package.json` `./connection` export → B7. ✅
- `dotenv` → `dependencies` → B7. ✅
- Factory `tokenRefresher` override → B5. ✅
- Client tests use local `MockCalmConnection`, no upward dep on server → A4. ✅
- Cross-package order (client 0.4.0 first, then server) → Part A before Part B; B0 links local build. ✅
- `processMonitoring.oauth2` 404→403/404 expectation → B8. ✅

**Placeholder scan:** No TBD/TODO; every code step has full code; commands have expected output. A4 and B8/B9 note "adapt to the file's existing harness" — these are unavoidable because the exact helper signatures live in files the implementer must read first; the steps say explicitly what to read and what to preserve.

**Type consistency:** `ICalmResponse`, `ICalmRequestOptions`, `CalmService`, `ITokenRefresher` all from `@mcp-abap-adt/interfaces`. `CalmApiError`/`calmErrorFromBody` from `@mcp-abap-adt/calm-client`. `IAbstractCalmConnectionOptions` defined in B2, extended in B3. `ICalmServerConfig` from `./config` used consistently in B5. Factory override type `ICreateCalmConnectionOverrides` defined once (B5), matches spec.
