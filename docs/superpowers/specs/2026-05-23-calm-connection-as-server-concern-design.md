# Connection ownership: move out of `calm-client`, DI-first in `calm-server`

**Status:** Draft
**Date:** 2026-05-23
**Owner:** Oleksii Kyslytsia
**Affects:** `@mcp-abap-adt/calm-client` (breaking),
`@mcp-abap-adt/calm-server` (breaking),
no schema changes in `@mcp-abap-adt/interfaces`

## Problem

`@mcp-abap-adt/calm-client` currently bundles two concerns:

1. **API surface** — which tools exist, how OData queries are built,
   how responses are shaped. This is a property of the SAP Cloud ALM
   contract.
2. **Connection** — how to assemble URLs, which auth strategy applies,
   how tokens refresh, whether `/api` is appended for tenant vs
   sandbox. These are deployment/operational concerns.

`CalmConnection`'s constructor today injects an `apiPrefix` default of
`/api` when `mode === 'oauth2'`, requiring callers to know to strip
`/api` from the tenant URL or the client will double-prefix it. This
bug literally bit us in this same brainstorm session — see
`processMonitoring.oauth2.test.ts` regression on
`https://eu10-004.alm.cloud.sap`.

The sibling project `mcp-abap-adt-workspace` settled connection
ownership cleanly: `IAbapConnection` is a pure interface in
`@mcp-abap-adt/interfaces`; concrete implementations live in a
connection package; consumers (`EmbeddableMcpServer`,
`StdioServer`, `cloud-llm-hub`) inject implementations rather than
constructing them inside the client.

CALM side already has the interface (`ICalmConnection` is in
`@mcp-abap-adt/interfaces`) but the implementation lives inside
`calm-client`. That mix is the wrong boundary.

We do not extract into a new package — only two impls on one
transport, single consumer today. YAGNI. We DO enforce DI so the
shape is right when a second consumer or impl shows up.

## Non-goals

- **New npm package for connection.** Unlike ABAP (Basic/JWT/SAML/RFC,
  HTTP+RFC, cloud+on-prem), CALM has two HTTP impls only. Keep them
  inside `calm-server`. Extract later if a second consumer (e.g.,
  `cloud-llm-hub` gaining CALM) or a third impl (BTP destination
  service, mTLS) appears.
- **Multi-binding / multi-tenant in one process.** Single `baseUrl`
  per process is enough until a tenant proves otherwise.
- **Adaptive tool registration** (startup-probe + filter by
  `200`/`403`/`404`). Separate spec.
- **New tool surfaces** for ExM / HM / Integration-Monitoring. Out of
  scope; no endpoint truth yet.
- **Changing the `ICalmConnection` interface.** Current shape
  (`connect`, `getBaseUrl`, `getServiceUrl`, `makeRequest`) already
  fits. We only move the implementation.

## Design

### Principle: DI is the contract

`CalmClient` only knows about `ICalmConnection`. Anything that can
satisfy that interface — the default `OAuth2CalmConnection`, the
default `SandboxCalmConnection`, a mock in a unit test, a future
BTP-destination-backed impl in `cloud-llm-hub` — is a valid input.

calm-server provides two paths, both feeding the same DI seam — the
existing `BaseCalmMcpServer({ calm: CalmClient, … })` constructor
option. We do **not** add env reading inside `BaseCalmMcpServer`; env
wiring stays in `runStdio.ts`. The `calm: CalmClient` parameter is
already the DI hook — we just make sure the connection underneath it
is freely substitutable.

- **Stdio path** (`src/server/runStdio.ts`): reads env, calls factory,
  builds connection, wraps it in `new CalmClient(connection)`, passes
  to `BaseCalmMcpServer`. Zero-config for the npx end-user.
  Unchanged in shape from today; only the inside of `buildClient.ts`
  changes.
- **Embeddable path**: consumer constructs whatever `ICalmConnection`
  it wants (using our factory, or its own impl), wraps it in
  `new CalmClient(connection)`, passes to `BaseCalmMcpServer` —
  identical surface to today, so no API churn for existing embedders.

Both paths use the same `BaseCalmMcpServer` core. Only the source of
the `CalmClient` differs.

### File layout after the change

```
@mcp-abap-adt/interfaces                  unchanged
  └── ICalmConnection, CalmService, ICalmRequestOptions

@mcp-abap-adt/calm-client                 BREAKING — drops connection
  ├── CalmClient(connection: ICalmConnection)
  ├── core/* — tool primitives, all take ICalmConnection
  ├── odata/*, errors/*, types/*
  └── (no CalmConnection.ts, no auth/, no serviceRoutes.ts here)

@mcp-abap-adt/calm-server                 BREAKING — owns connection
  ├── server/
  │   ├── connection/                     NEW subdir
  │   │   ├── AbstractCalmConnection.ts   shared HTTP, retry, URL build
  │   │   ├── SandboxCalmConnection.ts    api-key
  │   │   ├── OAuth2CalmConnection.ts     XSUAA via ITokenRefresher
  │   │   ├── XsuaaRefresher.ts           extracted from current buildClient.ts
  │   │   ├── serviceRoutes.ts            moved from calm-client/connection/
  │   │   └── createCalmConnection.ts     factory: ICalmServerConfig → impl
  │   ├── config.ts                       env → ICalmServerConfig (unchanged shape)
  │   ├── buildClient.ts                  thin: factory + new CalmClient(conn)
  │   ├── BaseCalmMcpServer.ts            unchanged API; still takes calm: CalmClient
  │   └── runStdio.ts                     stdio entrypoint (env → buildClient → base)
  └── tools/*                             unchanged
```

### `@mcp-abap-adt/calm-client` (breaking, 0.4.0)

- Delete `src/connection/CalmConnection.ts`.
- Delete `src/connection/serviceRoutes.ts`.
- Delete `src/auth/XsuaaRefresher.ts`.
- `CalmClient` keeps `constructor(connection: ICalmConnection)`. No
  other public-surface changes.
- Every `core/<service>/Calm*.ts` already calls
  `this.connection.makeRequest(…)` against `ICalmConnection`. No
  changes needed.
- `src/index.ts` stops re-exporting `CalmConnection`,
  `ICalmConnectionOptions`, `XsuaaRefresher`. Keeps re-exports of
  pure contracts.
- **New public re-export** required by the moved server-side
  connection impls: add the transport-agnostic `calmErrorFromBody`
  (see "Transport-agnostic error helper" above) to `src/index.ts`
  alongside the already-exported `CalmApiError`/`CalmApiErrorCode`.
  Remove the axios-coupled `toCalmApiError` (dead once
  `CalmConnection.ts` is gone). Without `calmErrorFromBody` the
  server-side connection cannot construct the same error shape and
  the regression gate fails.
- Unit tests that constructed a real `CalmConnection` switch to an
  in-file `MockCalmConnection` — a few lines implementing
  `ICalmConnection` directly. Do **not** dev-depend on `calm-server`
  for test utilities: the new ownership boundary is "client depends
  on interfaces only", and reaching upward to server would invert
  it.

### `@mcp-abap-adt/calm-server` (breaking, 0.4.0)

#### `src/server/connection/AbstractCalmConnection.ts`

Holds shared mechanics:

- `baseUrl: string` — used **verbatim**, no prefix injection, no
  normalization, no stripping.
- `serviceRoutes: ICalmServiceRoutes` — default map (the current
  values), overridable via ctor option.
- `defaultTimeout?: number`.
- `getBaseUrl()`, `getServiceUrl(service)` as pure
  `joinUrl(baseUrl, serviceRoutes[service])`.
- `makeRequest()` template: build URL, call `attachAuth(headers)`
  (abstract), do HTTP via **native `fetch`** with `AbortSignal.timeout`,
  parse errors, optionally dispatch retry via `onAuthFailure()`
  (abstract, default no-op).

**Transport choice:** `calm-server`'s `package.json` currently lists
no runtime `dependencies` block — only `peerDependencies` and
`devDependencies`. There is, however, one **implicit** runtime
dependency: `src/server/config.ts` imports `dotenv`, and `dotenv` is
listed only in `devDependencies`. That's a latent install-time bug
in the current package and is fixed as part of this release (see the
calm-server release step below: introduce a `dependencies` block,
move `dotenv` into it).

The existing `CalmConnection` in `calm-client` uses `axios`. We
rewrite the moved code onto native `fetch` (Node 18+, already
required) rather than adding `axios` to `calm-server`'s
`dependencies`. After this change the runtime-deps story is
honest: one entry (`dotenv`) for env-file loading, nothing for HTTP. Behavioural parity points:

- Bearer/api-key header injection — straightforward header map.
- Status-based error mapping — `response.ok`, `response.status`,
  body via `response.json()` / `response.text()` exactly as the
  current `parseCalmError.ts` consumes.

**Error-contract preservation (mandatory):** the fetch rewrite must
throw the **same public error types and shapes** the current
axios-based `CalmConnection` produces — i.e. `CalmApiError`
(`status`, `code`, `message`, `body`) and the
`parseCalmError`/`toCalmApiError` envelope that downstream
`mapCalmErrorForTool` in `src/utils/errorMapping.ts` already handles.
Generic `throw new Error(...)` is not acceptable.

**Where the error primitives live:** `CalmApiError` stays in
`calm-client` (`@mcp-abap-adt/calm-client/src/errors/`). The new
connection impls in `calm-server/src/server/connection/` import it
from `@mcp-abap-adt/calm-client` and build errors via its public
static factories (`CalmApiError.fromOData`, `.fromHttp`,
`.fromNetwork`). This is the natural dependency direction (server
already depends on client) and avoids duplicating the error classes.
Do **not** re-implement `CalmApiError` server-side or move the error
module — that would create two non-equal classes across packages and
break `instanceof` checks in existing handlers.

**Transport-agnostic error helper:** the current
`toCalmApiError(cause)` in `calm-client/src/connection/parseCalmError.ts`
is **axios-coupled** — it reads `cause.response.status` /
`cause.response.data`. A `fetch`-based connection has no such error
object. Refactor `parseCalmError.ts` to split out a
transport-agnostic core and export it:

```ts
// returns CalmApiError from an already-extracted (status, parsedBody)
export function calmErrorFromBody(status: number, data: unknown): CalmApiError;
```

`calmErrorFromBody` performs the OData-shape detection (currently the
private `hasODataErrorShape`) and dispatches to
`CalmApiError.fromOData` / `.fromHttp`. The legacy axios
`toCalmApiError` is removed along with the axios-based
`CalmConnection`; nothing else in calm-client consumes it (verified:
only `CalmConnection.ts` imported it). The fetch connection in
calm-server calls `calmErrorFromBody(status, body)` for HTTP errors
and `CalmApiError.fromNetwork(cause, msg)` for transport failures.
This supersedes the earlier note about exporting `toCalmApiError`. Unit tests in both
calm-client (for whatever error-translation surface remains there)
and calm-server (`errorMapping` tests + integration suites) must
pass unchanged against the new transport — that is the regression
gate for "did the rewrite preserve behavior".
- Timeouts — `AbortSignal.timeout(ms)`.
- One retry on auth failure (401/403) via `onAuthFailure()` — same
  logic as today, just dispatched after `fetch` instead of axios
  interceptors.

The fetch path adds no HTTP runtime dependency to `calm-server`
(the only runtime dependency remains `dotenv`, used by `config.ts`).
- `connect()` default no-op.

#### `src/server/connection/SandboxCalmConnection.ts`

Ctor: `{ baseUrl, apiKey, defaultTimeout?, serviceRoutes? }`.
`attachAuth` sets the SAP API Hub key header. `onAuthFailure`
returns false (no refresh).

#### `src/server/connection/OAuth2CalmConnection.ts`

Ctor: `{ baseUrl, tokenRefresher, defaultTimeout?, serviceRoutes? }`.
`attachAuth` calls `tokenRefresher.getToken()`, sets
`Authorization: Bearer`.
`onAuthFailure` calls `tokenRefresher.refreshToken()` (the existing
`ITokenRefresher` method) and signals one retry.

#### `src/server/connection/XsuaaRefresher.ts`

Currently defined inline in `src/server/buildClient.ts` as a private
class. Extract it into its own file under `src/server/connection/`.
Same code, new home — implements
`ITokenRefresher` from `@mcp-abap-adt/interfaces` (`getToken()` +
`refreshToken()`). Consumers that already run
`@mcp-abap-adt/auth-broker` can pass their own `ITokenRefresher`
via the factory or skip the factory entirely.

#### `src/server/connection/serviceRoutes.ts`

Moved from `calm-client/src/connection/`. Default-export the same
map. Exported as
`DEFAULT_CALM_SERVICE_ROUTES: ICalmServiceRoutes`.

#### `src/server/connection/createCalmConnection.ts`

```ts
import { OAuth2CalmConnection } from './OAuth2CalmConnection';
import { SandboxCalmConnection } from './SandboxCalmConnection';
import { XsuaaRefresher } from './XsuaaRefresher';
import type {
  ICalmConnection,
  ITokenRefresher,
} from '@mcp-abap-adt/interfaces';
import type { ICalmServerConfig } from '../config';

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
  throw new Error(`Unsupported CALM mode: ${(config as { mode: string }).mode}`);
}
```

The factory is one of two ways to obtain a connection — never the
only way. Consumers that already run `@mcp-abap-adt/auth-broker` (or
similar) pass their own refresher via the `overrides.tokenRefresher`
parameter. Consumers that want a fully custom transport skip the
factory entirely and construct an `ICalmConnection` of their own
shape.

#### `src/server/config.ts`

- `CALM_BASE_URL` consumed **verbatim** in both modes — no slicing,
  no auto-`/api`.
- Sandbox default `https://sandbox.api.sap.com/SAPCALM` unchanged.
- OAuth2 documentation reads: "paste `endpoints.Api` from the
  service-key as-is, including the `/api` suffix".

#### `src/server/buildClient.ts`

Becomes:

```ts
import { createCalmConnection } from './connection/createCalmConnection';
import { CalmClient } from '@mcp-abap-adt/calm-client';
import type { ICalmServerConfig } from './config';

export function buildCalmClient(config: ICalmServerConfig): CalmClient {
  return new CalmClient(createCalmConnection(config));
}
```

#### `src/server/BaseCalmMcpServer.ts`

**No public-API changes.** The existing `calm: CalmClient` constructor
parameter is already the DI seam: anyone who can build a `CalmClient`
(which now means: build an `ICalmConnection` first, then wrap) can
inject one. No env reading inside the base server, no factory call —
that responsibility lives one level up in `runStdio.ts` or in the
embedding consumer.

Rationale: pushing env logic into the base server would create two
paths to obtain config (constructor option vs internal fallback) and
duplicate the embeddable contract that `runStdio.ts` already enforces.
Keep one DI seam, document it, and move on.

#### `package.json` exports

Add `./connection` to the existing `exports` map so the new subdir is
importable by tests and any monorepo-internal consumer that wants the
connection impls without pulling the full server:

Match the existing CommonJS export style (`"default"` condition,
since the package is `"module": "commonjs"` in tsconfig and the
existing entries use `"default"`):

```jsonc
"exports": {
  ".":          { "types": "./dist/index.d.ts",             "default": "./dist/index.js" },
  "./tools":    { "types": "./dist/tools/index.d.ts",       "default": "./dist/tools/index.js" },
  "./registry": { "types": "./dist/registry/index.d.ts",    "default": "./dist/registry/index.js" },
  "./connection": {                                                       // NEW
    "types":   "./dist/server/connection/index.d.ts",
    "default": "./dist/server/connection/index.js"
  }
}
```

If/when the package goes dual ESM+CJS, split into `"import"` +
`"require"` for every entry uniformly. That's out of scope here.

`src/server/connection/index.ts` re-exports the public surface:
`createCalmConnection`, `OAuth2CalmConnection`,
`SandboxCalmConnection`, `XsuaaRefresher`,
`DEFAULT_CALM_SERVICE_ROUTES`.

#### `.env.example` + `CLAUDE.md`

`.env.example`:

```env
# OAuth2 — paste endpoints.Api from your service-key verbatim.
# Example: https://eu10-004.alm.cloud.sap/api  (note the /api suffix)
CALM_BASE_URL=
```

`CLAUDE.md` "Critical pitfall" section adds:

> `CALM_BASE_URL` is consumed as-is. Tenant `endpoints.Api` includes
> `/api`; copy it 1:1. The connection layer no longer injects `/api`.

### Architectural responsibilities after the change

| Concern | Owner |
|---|---|
| `ICalmConnection` contract | `@mcp-abap-adt/interfaces` |
| Concrete connection impls (Sandbox, OAuth2) | `calm-server/src/server/connection/` |
| `serviceRoutes` default map | `calm-server/src/server/connection/` |
| `XsuaaRefresher` | `calm-server/src/server/connection/` |
| Factory: `ICalmServerConfig → ICalmConnection` | `calm-server/src/server/connection/` |
| Env → `ICalmServerConfig` | `calm-server/src/server/config.ts` |
| DI seam (`calm: CalmClient` ctor parameter, already exists) | `calm-server/src/server/BaseCalmMcpServer.ts` |
| Stdio wiring (env → factory → CalmClient) | `calm-server/src/server/runStdio.ts` |
| Tools, OData query builders, types | `calm-client` |
| `CalmClient(connection)` plumbing | `calm-client` |

### Migration behavior

Before:

```
CALM_BASE_URL=https://eu10-004.alm.cloud.sap        # without /api
  + calm-client mode-default injects /api
  → final: https://eu10-004.alm.cloud.sap/api/calm-features/v1
```

After:

```
CALM_BASE_URL=https://eu10-004.alm.cloud.sap/api    # exactly endpoints.Api
  + connection just concats with serviceRoutes
  → final: https://eu10-004.alm.cloud.sap/api/calm-features/v1
```

Sandbox case before and after is unchanged.

The mistake class "what is the base URL convention" disappears: it
is literally whatever `endpoints.Api` says.

## Cross-package release order

Per `CLAUDE.md` and the `cross-package-fix-cycle` skill:

1. **`@mcp-abap-adt/interfaces`** — no changes needed.
2. **`@mcp-abap-adt/calm-client` 0.4.0** — drop `CalmConnection.ts`,
   `XsuaaRefresher`, `serviceRoutes`. Update internal tests to use a
   `MockCalmConnection` that implements the interface. PR, review,
   merge, tag, publish.
3. **`@mcp-abap-adt/calm-server` 0.4.0** — bump peer-dep, add
   `src/server/connection/` directory with the rewritten-on-fetch
   impls, factory, extracted `XsuaaRefresher`, and a re-export
   `index.ts`. Simplify `buildClient.ts` to one factory call.
   `BaseCalmMcpServer` stays untouched (its `calm: CalmClient`
   parameter is the DI seam, no API change). Update `.env.example`,
   `CLAUDE.md`, integration `.env`, and the `exports` map in
   `package.json` to publish `./connection`. Introduce a `dependencies`
   block in `package.json` and move `dotenv` from `devDependencies`
   into it — `config.ts` already imports it at runtime, so this only
   makes the manifest match reality. Tag, publish.

The failing live-tenant test `processMonitoring.oauth2.test.ts`
moves from 404 (wrong URL) to 403 (correct URL, scope missing) —
the honest signal we want. Test expectation is loosened to accept
`403` or `404` and treat both as "this client cannot reach this
service" while distinguishing them in the failure message.

## Risks

- **Two packages move in one logical change.** Strict ordering:
  client first, server next. Each cuts its own release; no in-flight
  broken combinations.
- **Breaking change to calm-client public surface.** Anyone outside
  this monorepo who imports `CalmConnection` from calm-client
  breaks. No known external consumers; one-line migration if any
  appear.
- **Existing user `.env` files** lose function if `CALM_BASE_URL`
  doesn't include `/api`. Failure mode is loud (404 on every call),
  fix documented.
- **Server now owns implementation files.** If a future second
  consumer (e.g., `cloud-llm-hub`) wants the impls without pulling
  in the whole server, we extract to a new package then. Today,
  importing from `@mcp-abap-adt/calm-server/connection` is fine for
  the same monorepo.

## Open questions

None blocking. Followups: (a) startup-probe + adaptive tool
registration; (b) ExM/HM/IntMon tooling once endpoints surface;
(c) extraction to a separate connection package when a second
consumer materializes.
