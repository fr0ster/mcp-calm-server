# Auth-broker integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace inline `XsuaaRefresher` class in `src/server/buildClient.ts` with a `@mcp-abap-adt/auth-broker`-based pipeline that lets users choose `client_credentials` or `authorization_code` flow via `CALM_AUTH_FLOW`, consumes a `{destination}.env` file produced by `mcp-auth` CLI, and preserves back-compat for existing `.env` files that still inline `CALM_UAA_*`.

**Architecture:** `buildCalmClient(config, opts?)` reads `config.authFlow`/`config.destination`, calls `buildAuthBroker(config, logger?)` which assembles `AuthBroker` from a chosen `ITokenProvider` (CC or AC) + a chosen `ISessionStore` (file-based `XsuaaSessionStore` by default; in-memory `SafeXsuaaSessionStore` via `legacyEnvShim` when the legacy `CALM_UAA_*` vars are present). Broker returns an `ITokenRefresher` via `createTokenRefresher(destination)` that is plugged into `CalmConnection`.

**Tech Stack:** TypeScript 5.9, Node ≥ 18, Jest 30 + ts-jest, `@mcp-abap-adt/auth-broker@^1.0.5`, `@mcp-abap-adt/auth-providers@^1.0.5`, `@mcp-abap-adt/auth-stores@^1.0.4`, `@mcp-abap-adt/interfaces@^7.1.0`.

**Spec:** `docs/superpowers/specs/2026-05-18-auth-broker-integration-design.md`

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `package.json` | Modify | Promote `@mcp-abap-adt/auth-broker`, `auth-providers`, `auth-stores` from `devDependencies` to `peerDependencies` |
| `src/server/config.ts` | Modify | Add `authFlow` + `destination` fields to `ICalmServerConfig`; parse `CALM_AUTH_FLOW` and `CALM_DESTINATION` env vars |
| `src/server/auth/legacyEnvShim.ts` | Create | If `CALM_UAA_*` inline vars are present, return a preloaded `SafeXsuaaSessionStore` (in-memory); else `null` |
| `src/server/auth/buildBroker.ts` | Create | Build `AuthBroker` from `ICalmServerConfig`: pick provider by `authFlow`, pick store via `legacyEnvShim` else file-based `XsuaaSessionStore` |
| `src/server/buildClient.ts` | Modify | Drop inline `XsuaaRefresher` class; call `buildAuthBroker(config, logger)` and use `broker.createTokenRefresher(destination)` for `CalmConnection` |
| `src/server/runStdio.ts` | Modify | Pass existing `StderrLogger` instance into `buildCalmClient` so broker logs to stderr (CLAUDE.md stdout rule) |
| `src/__tests__/unit/server/config.test.ts` | Modify | Add cases for `CALM_AUTH_FLOW` (default cc, ac, unknown→throw) and `CALM_DESTINATION` (default `DEFAULT`, override) |
| `src/__tests__/unit/server/auth/legacyEnvShim.test.ts` | Create | Detection cases: no inline UAA → null; full inline → seeded store; partial → null |
| `src/__tests__/unit/server/auth/buildBroker.test.ts` | Create | Mock broker/provider/store classes, verify correct choice per `authFlow`, store-selection branch |
| `src/__tests__/unit/server/buildClient.test.ts` | Modify | Replace `XsuaaRefresher` assertions with broker-pipeline assertions |
| `.env.example` | Modify | Add commented `CALM_AUTH_FLOW=` and `CALM_DESTINATION=` examples + reference to `mcp-auth` |
| `README.md` | Modify | New "Authentication setup" section with CC/AC quickstarts |

`.gitignore` — already covers `*.env` (line 18) and `sk.json` (line 17), no change.

---

### Task 1: Promote auth-broker deps to peerDependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Edit `package.json` — move three packages from `devDependencies` to `peerDependencies`**

In `peerDependencies` block, add:
```json
    "@mcp-abap-adt/auth-broker": "^1.0.5",
    "@mcp-abap-adt/auth-providers": "^1.0.5",
    "@mcp-abap-adt/auth-stores": "^1.0.4",
```
Keep them in `devDependencies` (peer deps must also be installed locally for testing).

- [ ] **Step 2: Run `npm install` to refresh `package-lock.json`**

Run: `npm install`
Expected: `package-lock.json` updated, no errors.

- [ ] **Step 3: Verify the install — peer warning should NOT fire because devDeps still cover them**

Run: `npm ls @mcp-abap-adt/auth-broker`
Expected: shows `^1.0.5` resolved, no `UNMET PEER DEPENDENCY` warning.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): promote auth-broker family to peerDependencies"
```

---

### Task 2: Extend config with authFlow + destination

**Files:**
- Modify: `src/server/config.ts`
- Test: `src/__tests__/unit/server/config.test.ts`

- [ ] **Step 1: Write the failing tests — append to `config.test.ts` inside the existing `describe('readConfig')`:**

```ts
  test('default authFlow is client_credentials', () => {
    for (const k of Object.keys(process.env)) {
      if (k.startsWith('CALM_')) delete process.env[k];
    }
    process.env.CALM_MODE = 'oauth2';
    process.env.CALM_BASE_URL = 'https://t.eu10.alm.cloud.sap';
    process.env.CALM_UAA_URL = 'https://uaa.example';
    process.env.CALM_UAA_CLIENT_ID = 'cid';
    process.env.CALM_UAA_CLIENT_SECRET = 'secret';
    expect(readConfig().authFlow).toBe('client_credentials');
  });

  test('CALM_AUTH_FLOW=authorization_code parsed', () => {
    for (const k of Object.keys(process.env)) {
      if (k.startsWith('CALM_')) delete process.env[k];
    }
    process.env.CALM_MODE = 'oauth2';
    process.env.CALM_BASE_URL = 'https://t.eu10.alm.cloud.sap';
    process.env.CALM_AUTH_FLOW = 'authorization_code';
    expect(readConfig().authFlow).toBe('authorization_code');
  });

  test('CALM_AUTH_FLOW unknown value throws', () => {
    for (const k of Object.keys(process.env)) {
      if (k.startsWith('CALM_')) delete process.env[k];
    }
    process.env.CALM_MODE = 'oauth2';
    process.env.CALM_BASE_URL = 'https://t.eu10.alm.cloud.sap';
    process.env.CALM_AUTH_FLOW = 'weird';
    expect(() => readConfig()).toThrow(/CALM_AUTH_FLOW/);
  });

  test('default destination is DEFAULT', () => {
    for (const k of Object.keys(process.env)) {
      if (k.startsWith('CALM_')) delete process.env[k];
    }
    process.env.CALM_MODE = 'sandbox';
    process.env.CALM_API_KEY = 'sk';
    expect(readConfig().destination).toBe('DEFAULT');
  });

  test('CALM_DESTINATION overrides default', () => {
    for (const k of Object.keys(process.env)) {
      if (k.startsWith('CALM_')) delete process.env[k];
    }
    process.env.CALM_MODE = 'sandbox';
    process.env.CALM_API_KEY = 'sk';
    process.env.CALM_DESTINATION = 'PROD';
    expect(readConfig().destination).toBe('PROD');
  });
```

- [ ] **Step 2: Run the new tests — verify all 5 fail**

Run: `npx jest src/__tests__/unit/server/config.test.ts -t "authFlow|destination" --runInBand`
Expected: 5 failures (TS errors that `authFlow`/`destination` don't exist on `ICalmServerConfig`).

- [ ] **Step 3: Edit `src/server/config.ts` — add types and parsing**

After the `CalmServerMode` type, add:
```ts
export type CalmAuthFlow = 'client_credentials' | 'authorization_code';
```

Inside `ICalmServerConfig`:
```ts
  authFlow: CalmAuthFlow;
  destination: string;
```

In `readConfig()`, after the `mode` check and before the `timeoutMs` line, add:
```ts
  const rawAuthFlow = process.env.CALM_AUTH_FLOW;
  let authFlow: CalmAuthFlow = 'client_credentials';
  if (rawAuthFlow) {
    if (rawAuthFlow === 'client_credentials' || rawAuthFlow === 'authorization_code') {
      authFlow = rawAuthFlow;
    } else {
      throw new Error(
        `[calm-mcp] CALM_AUTH_FLOW must be 'client_credentials' or 'authorization_code', got "${rawAuthFlow}".`,
      );
    }
  }
  const destination = process.env.CALM_DESTINATION || 'DEFAULT';
```

Add `authFlow,` and `destination,` to both return-object literals (oauth2 branch and sandbox branch).

- [ ] **Step 4: Run the new tests — verify pass**

Run: `npx jest src/__tests__/unit/server/config.test.ts --runInBand`
Expected: all 13 tests pass (8 original + 5 new).

- [ ] **Step 5: Run the full test suite to verify nothing else broke**

Run: `npm test -- --runInBand`
Expected: all suites pass (existing test count + 5 new = +5).

- [ ] **Step 6: Commit**

```bash
git add src/server/config.ts src/__tests__/unit/server/config.test.ts
git commit -m "feat(config): add CALM_AUTH_FLOW and CALM_DESTINATION env vars"
```

---

### Task 3: Implement legacy env shim

**Files:**
- Create: `src/server/auth/legacyEnvShim.ts`
- Create: `src/__tests__/unit/server/auth/legacyEnvShim.test.ts`

- [ ] **Step 1: Write the failing tests — create `src/__tests__/unit/server/auth/legacyEnvShim.test.ts`**

```ts
import { buildLegacyShimStore } from '../../../../server/auth/legacyEnvShim';
import type { ICalmServerConfig } from '../../../../server/config';

const baseConfig: ICalmServerConfig = {
  mode: 'oauth2',
  baseUrl: 'https://t.eu10.alm.cloud.sap',
  authFlow: 'client_credentials',
  destination: 'DEFAULT',
  timeoutMs: 30_000,
};

describe('buildLegacyShimStore', () => {
  test('returns null when no inline UAA creds present', async () => {
    const store = await buildLegacyShimStore({ ...baseConfig });
    expect(store).toBeNull();
  });

  test('returns seeded store when all three UAA fields present', async () => {
    const store = await buildLegacyShimStore({
      ...baseConfig,
      uaaUrl: 'https://uaa.example',
      uaaClientId: 'cid',
      uaaClientSecret: 'secret',
    });
    expect(store).not.toBeNull();
    const authConfig = await store!.getAuthorizationConfig('DEFAULT');
    expect(authConfig?.uaaUrl).toBe('https://uaa.example');
    expect(authConfig?.clientId).toBe('cid');
    expect(authConfig?.clientSecret).toBe('secret');
  });

  test('returns null when only some UAA fields present (partial)', async () => {
    const store = await buildLegacyShimStore({
      ...baseConfig,
      uaaUrl: 'https://uaa.example',
      // missing clientId, clientSecret
    });
    expect(store).toBeNull();
  });
});
```

- [ ] **Step 2: Run — verify fail with "module not found"**

Run: `npx jest src/__tests__/unit/server/auth/legacyEnvShim.test.ts --runInBand`
Expected: FAIL — "Cannot find module '../../../../server/auth/legacyEnvShim'".

- [ ] **Step 3: Create `src/server/auth/legacyEnvShim.ts`**

```ts
import { SafeXsuaaSessionStore } from '@mcp-abap-adt/auth-stores';
import type { ISessionStore } from '@mcp-abap-adt/interfaces';
import type { ICalmServerConfig } from '../config';

/**
 * If the user's `.env` still inlines `CALM_UAA_URL`/`CALM_UAA_CLIENT_ID`/
 * `CALM_UAA_CLIENT_SECRET` (pre-broker convention), build an in-memory
 * SafeXsuaaSessionStore preloaded with those creds. Returns null if any
 * of the three are missing — caller falls back to file-based store.
 */
export async function buildLegacyShimStore(
  config: ICalmServerConfig,
): Promise<ISessionStore | null> {
  const { uaaUrl, uaaClientId, uaaClientSecret, baseUrl, destination } = config;
  if (!uaaUrl || !uaaClientId || !uaaClientSecret) return null;

  const store = new SafeXsuaaSessionStore(baseUrl);
  await store.setAuthorizationConfig(destination, {
    uaaUrl,
    clientId: uaaClientId,
    clientSecret: uaaClientSecret,
  });
  return store;
}
```

- [ ] **Step 4: Run — verify 3 tests pass**

Run: `npx jest src/__tests__/unit/server/auth/legacyEnvShim.test.ts --runInBand`
Expected: 3 passed.

- [ ] **Step 5: Run full test suite for regression check**

Run: `npm test -- --runInBand`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/server/auth/legacyEnvShim.ts src/__tests__/unit/server/auth/legacyEnvShim.test.ts
git commit -m "feat(auth): legacy env shim for inline CALM_UAA_* creds"
```

---

### Task 4: Implement buildAuthBroker

**Files:**
- Create: `src/server/auth/buildBroker.ts`
- Create: `src/__tests__/unit/server/auth/buildBroker.test.ts`

- [ ] **Step 1: Write the failing tests — create `src/__tests__/unit/server/auth/buildBroker.test.ts`**

```ts
import { AuthBroker } from '@mcp-abap-adt/auth-broker';
import {
  AuthorizationCodeProvider,
  ClientCredentialsProvider,
} from '@mcp-abap-adt/auth-providers';
import {
  SafeXsuaaSessionStore,
  XsuaaSessionStore,
} from '@mcp-abap-adt/auth-stores';
import { buildAuthBroker } from '../../../../server/auth/buildBroker';
import type { ICalmServerConfig } from '../../../../server/config';

jest.mock('@mcp-abap-adt/auth-broker');
jest.mock('@mcp-abap-adt/auth-providers');
jest.mock('@mcp-abap-adt/auth-stores');

const baseConfig: ICalmServerConfig = {
  mode: 'oauth2',
  baseUrl: 'https://t.eu10.alm.cloud.sap',
  authFlow: 'client_credentials',
  destination: 'DEFAULT',
  timeoutMs: 30_000,
  uaaUrl: 'https://uaa.example',
  uaaClientId: 'cid',
  uaaClientSecret: 'secret',
};

describe('buildAuthBroker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('client_credentials flow uses ClientCredentialsProvider', async () => {
    await buildAuthBroker({ ...baseConfig, authFlow: 'client_credentials' });
    expect(ClientCredentialsProvider).toHaveBeenCalledWith({
      uaaUrl: 'https://uaa.example',
      clientId: 'cid',
      clientSecret: 'secret',
    });
    expect(AuthorizationCodeProvider).not.toHaveBeenCalled();
  });

  test('authorization_code flow uses AuthorizationCodeProvider', async () => {
    await buildAuthBroker({ ...baseConfig, authFlow: 'authorization_code' });
    expect(AuthorizationCodeProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        uaaUrl: 'https://uaa.example',
        clientId: 'cid',
        clientSecret: 'secret',
        browser: 'none',
      }),
    );
    expect(ClientCredentialsProvider).not.toHaveBeenCalled();
  });

  test('inline CALM_UAA_* uses SafeXsuaaSessionStore (legacy shim)', async () => {
    await buildAuthBroker({ ...baseConfig });
    expect(SafeXsuaaSessionStore).toHaveBeenCalledWith('https://t.eu10.alm.cloud.sap');
    expect(XsuaaSessionStore).not.toHaveBeenCalled();
  });

  test('no inline UAA → file-based XsuaaSessionStore on cwd', async () => {
    const noInline = {
      ...baseConfig,
      uaaUrl: undefined,
      uaaClientId: undefined,
      uaaClientSecret: undefined,
    };
    await buildAuthBroker(noInline);
    expect(XsuaaSessionStore).toHaveBeenCalledWith(
      process.cwd(),
      'https://t.eu10.alm.cloud.sap',
    );
    expect(SafeXsuaaSessionStore).not.toHaveBeenCalled();
  });

  test('AuthBroker is constructed with allowBrowserAuth=false', async () => {
    await buildAuthBroker({ ...baseConfig });
    expect(AuthBroker).toHaveBeenCalledWith(
      expect.objectContaining({ allowBrowserAuth: false }),
      'none',
      undefined,
    );
  });

  test('passes logger through to AuthBroker constructor', async () => {
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    await buildAuthBroker({ ...baseConfig }, logger as any);
    expect(AuthBroker).toHaveBeenCalledWith(expect.anything(), 'none', logger);
  });
});
```

- [ ] **Step 2: Run — verify fail with "module not found"**

Run: `npx jest src/__tests__/unit/server/auth/buildBroker.test.ts --runInBand`
Expected: FAIL — `buildBroker` module missing.

- [ ] **Step 3: Create `src/server/auth/buildBroker.ts`**

```ts
import { AuthBroker } from '@mcp-abap-adt/auth-broker';
import {
  AuthorizationCodeProvider,
  ClientCredentialsProvider,
} from '@mcp-abap-adt/auth-providers';
import { XsuaaSessionStore } from '@mcp-abap-adt/auth-stores';
import type {
  ILogger,
  ISessionStore,
  ITokenProvider,
} from '@mcp-abap-adt/interfaces';
import type { ICalmServerConfig } from '../config';
import { buildLegacyShimStore } from './legacyEnvShim';

/**
 * Assemble an `AuthBroker` from server config.
 *
 * - Chooses `ClientCredentialsProvider` or `AuthorizationCodeProvider`
 *   based on `config.authFlow`.
 * - Chooses session store: legacy `SafeXsuaaSessionStore` shim when the
 *   `.env` still inlines `CALM_UAA_*`, otherwise file-based
 *   `XsuaaSessionStore` rooted at cwd (loads `./{destination}.env`).
 * - Always `allowBrowserAuth: false` — interactive login is the job
 *   of the `mcp-auth` CLI, not the runtime server.
 * - `browser: 'none'` is the broker-level default for headless runs.
 *
 * Throws if `authorization_code` flow is selected but neither inline
 * creds nor a `{destination}.env` is available — message points the
 * user at `mcp-auth`.
 */
export async function buildAuthBroker(
  config: ICalmServerConfig,
  logger?: ILogger,
): Promise<AuthBroker> {
  const shimStore = await buildLegacyShimStore(config);
  const sessionStore: ISessionStore =
    shimStore ?? new XsuaaSessionStore(process.cwd(), config.baseUrl, logger);

  const tokenProvider: ITokenProvider =
    config.authFlow === 'authorization_code'
      ? new AuthorizationCodeProvider({
          uaaUrl: config.uaaUrl ?? '',
          clientId: config.uaaClientId ?? '',
          clientSecret: config.uaaClientSecret ?? '',
          browser: 'none',
          logger,
        })
      : new ClientCredentialsProvider({
          uaaUrl: config.uaaUrl ?? '',
          clientId: config.uaaClientId ?? '',
          clientSecret: config.uaaClientSecret ?? '',
        });

  return new AuthBroker(
    { sessionStore, tokenProvider, allowBrowserAuth: false },
    'none',
    logger,
  );
}
```

- [ ] **Step 4: Run the new tests — verify 6 pass**

Run: `npx jest src/__tests__/unit/server/auth/buildBroker.test.ts --runInBand`
Expected: 6 passed.

- [ ] **Step 5: Run the full test suite**

Run: `npm test -- --runInBand`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/server/auth/buildBroker.ts src/__tests__/unit/server/auth/buildBroker.test.ts
git commit -m "feat(auth): buildAuthBroker assembles broker per flow + store choice"
```

---

### Task 5: Refactor buildClient to use broker

**Files:**
- Modify: `src/server/buildClient.ts`
- Modify: `src/__tests__/unit/server/buildClient.test.ts`

- [ ] **Step 1: Read existing test to understand structure**

Run: `cat src/__tests__/unit/server/buildClient.test.ts`
Note the current assertions on `XsuaaRefresher` and how `CalmConnection` is mocked.

- [ ] **Step 2: Update test — replace XsuaaRefresher assertions**

Rewrite `src/__tests__/unit/server/buildClient.test.ts` to mock `buildAuthBroker` and verify `CalmConnection` receives the broker's refresher:

```ts
import { CalmConnection } from '@mcp-abap-adt/calm-client';
import { buildCalmClient } from '../../../server/buildClient';
import { buildAuthBroker } from '../../../server/auth/buildBroker';
import type { ICalmServerConfig } from '../../../server/config';

jest.mock('@mcp-abap-adt/calm-client');
jest.mock('../../../server/auth/buildBroker');

const fakeRefresher = { getToken: jest.fn(), refreshToken: jest.fn() };
const fakeBroker = { createTokenRefresher: jest.fn(() => fakeRefresher) };

const oauth2Config: ICalmServerConfig = {
  mode: 'oauth2',
  baseUrl: 'https://t.eu10.alm.cloud.sap',
  authFlow: 'client_credentials',
  destination: 'DEFAULT',
  timeoutMs: 30_000,
  uaaUrl: 'https://uaa.example',
  uaaClientId: 'cid',
  uaaClientSecret: 'secret',
};

describe('buildCalmClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (buildAuthBroker as jest.Mock).mockResolvedValue(fakeBroker);
  });

  test('oauth2: builds broker, passes refresher to CalmConnection', async () => {
    await buildCalmClient(oauth2Config);
    expect(buildAuthBroker).toHaveBeenCalledWith(oauth2Config, undefined);
    expect(fakeBroker.createTokenRefresher).toHaveBeenCalledWith('DEFAULT');
    expect(CalmConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'https://t.eu10.alm.cloud.sap',
        tokenRefresher: fakeRefresher,
        defaultTimeout: 30_000,
      }),
    );
  });

  test('oauth2 with logger: forwards logger to buildAuthBroker', async () => {
    const logger = { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() };
    await buildCalmClient(oauth2Config, { logger: logger as any });
    expect(buildAuthBroker).toHaveBeenCalledWith(oauth2Config, logger);
  });

  test('sandbox: bypasses broker, uses apiKey path', async () => {
    const sandboxConfig: ICalmServerConfig = {
      mode: 'sandbox',
      baseUrl: 'https://sandbox.api.sap.com/SAPCALM',
      authFlow: 'client_credentials',
      destination: 'DEFAULT',
      timeoutMs: 30_000,
      apiKey: 'sk',
    };
    await buildCalmClient(sandboxConfig);
    expect(buildAuthBroker).not.toHaveBeenCalled();
    expect(CalmConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'https://sandbox.api.sap.com/SAPCALM',
        apiKey: 'sk',
      }),
    );
  });
});
```

- [ ] **Step 3: Run — verify all 3 fail (`buildCalmClient` still uses XsuaaRefresher)**

Run: `npx jest src/__tests__/unit/server/buildClient.test.ts --runInBand`
Expected: FAIL — assertions about `buildAuthBroker` don't match because the function isn't called yet.

- [ ] **Step 4: Rewrite `src/server/buildClient.ts`**

Replace the entire file:

```ts
import { CalmClient, CalmConnection } from '@mcp-abap-adt/calm-client';
import type { ILogger } from '@mcp-abap-adt/interfaces';
import { buildAuthBroker } from './auth/buildBroker';
import type { ICalmServerConfig } from './config';

export interface BuildCalmClientOptions {
  logger?: ILogger;
}

/**
 * Build a ready-to-use `CalmClient` from a `ICalmServerConfig`.
 *
 * - `oauth2` mode: delegates token acquisition to `@mcp-abap-adt/auth-broker`.
 *   Pass `options.logger` (e.g. `StderrLogger` from `src/server/stderrLogger.ts`)
 *   when running in stdio mode so broker logs do NOT collide with the
 *   MCP JSON-RPC frames on stdout.
 * - `sandbox` mode: direct API-key auth, no broker involved.
 */
export async function buildCalmClient(
  config: ICalmServerConfig,
  options: BuildCalmClientOptions = {},
): Promise<CalmClient> {
  if (config.mode === 'oauth2') {
    const broker = await buildAuthBroker(config, options.logger);
    const refresher = broker.createTokenRefresher(config.destination);
    const connection = new CalmConnection({
      baseUrl: config.baseUrl,
      tokenRefresher: refresher,
      defaultTimeout: config.timeoutMs,
    });
    return new CalmClient(connection);
  }
  const connection = new CalmConnection({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey as string,
    defaultTimeout: config.timeoutMs,
  });
  return new CalmClient(connection);
}
```

Note: `buildCalmClient` is now async. All callers must be updated (next step).

- [ ] **Step 5: Update callers — runStdio.ts is the only call site**

Known call sites (verified):
- `src/server/runStdio.ts:22` — `const calm = buildCalmClient(config);` → must become `await buildCalmClient(config, { logger })`. Handled in Task 6.
- `src/server/index.ts:5` — re-export, no behavior change. **Note for library consumers:** `buildCalmClient` is now async — this is a breaking API change. Document in README (Task 7) and CHANGELOG entry (commit message of Task 5).

- [ ] **Step 6: Run the new tests — verify 3 pass**

Run: `npx jest src/__tests__/unit/server/buildClient.test.ts --runInBand`
Expected: 3 passed.

- [ ] **Step 7: Run full suite to catch regressions**

Run: `npm test -- --runInBand`
Expected: all green; integration tests that exercise oauth2 path now go through broker.

- [ ] **Step 8: Commit**

```bash
git add src/server/buildClient.ts src/__tests__/unit/server/buildClient.test.ts
git commit -m "refactor(server): replace XsuaaRefresher with auth-broker pipeline"
```

---

### Task 6: Wire StderrLogger into stdio runtime

**Files:**
- Modify: `src/server/runStdio.ts:22`

- [ ] **Step 1: Edit `src/server/runStdio.ts` line 22**

Current line 22:
```ts
  const calm = buildCalmClient(config);
```
Replace with:
```ts
  const calm = await buildCalmClient(config, { logger });
```

The `logger` variable is already in scope (created at line 20 — `const logger = new StderrLogger();`). No new imports needed.

- [ ] **Step 2: Run full test suite**

Run: `npm test -- --runInBand`
Expected: all green.

- [ ] **Step 3: Build to verify TS compiles**

Run: `npm run build`
Expected: no TS errors.

- [ ] **Step 4: Verify the existing StderrLogger guard test still passes**

Run: `npx jest StderrLogger --runInBand`
Expected: PASS — guard ensures no writes to stdout.

- [ ] **Step 5: Commit**

```bash
git add src/server/runStdio.ts
git commit -m "fix(stdio): forward StderrLogger to auth-broker (stdout safety)"
```

---

### Task 7: Update .env.example and README

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Update `.env.example`**

After the existing OAuth2 block, add:
```
# ─── Auth flow choice (optional, default: client_credentials) ───────────────
# CALM_AUTH_FLOW=client_credentials  # service-binding sb-* clients, no browser
# CALM_AUTH_FLOW=authorization_code  # user-scope, needs DEFAULT.env from mcp-auth

# ─── Destination name (optional, default: DEFAULT) ─────────────────────────
# Maps to ./{CALM_DESTINATION}.env file consumed by auth-broker.
# CALM_DESTINATION=DEFAULT

# ─── Generating ./DEFAULT.env from a BTP service key ───────────────────────
# Once with a service key downloaded from BTP cockpit:
#   npx mcp-auth --service-key ./sk.json --output ./DEFAULT.env \
#                --type xsuaa --credential                 # client_credentials
#   npx mcp-auth --service-key ./sk.json --output ./DEFAULT.env \
#                --type xsuaa --browser auto               # authorization_code
# After that the CALM_UAA_* block below can be removed — auth-broker reads
# tokens from ./DEFAULT.env.
```

- [ ] **Step 2: Update `README.md`**

Find the existing setup/installation section. Add a new sub-section:

```markdown
## Authentication setup

`calm-mcp` supports two OAuth2 flows for live tenants, selectable via
`CALM_AUTH_FLOW`:

| Flow | Use case | Browser? | Refresh token? |
|---|---|---|---|
| `client_credentials` (default) | technical service-binding (`sb-*` client) | no | no |
| `authorization_code` | end-user dev workflow, full user scope | once | yes |

### Option A — quick CC setup (technical user)

Plain `.env` with inline UAA creds works as before, no extra steps.

### Option B — broker-backed setup (CC or AC)

Use the bundled [`mcp-auth`](https://www.npmjs.com/package/@mcp-abap-adt/auth-broker)
CLI to convert a BTP service key into a token-bearing `.env`:

```bash
# CC (no browser)
npx mcp-auth --service-key ./sk.json --output ./DEFAULT.env \
             --type xsuaa --credential

# AC (browser pops once; refresh_token persists)
npx mcp-auth --service-key ./sk.json --output ./DEFAULT.env \
             --type xsuaa --browser auto
```

Then in `.env`:
```
CALM_MODE=oauth2
CALM_AUTH_FLOW=authorization_code   # or client_credentials
CALM_DESTINATION=DEFAULT
```

The server's runtime auth pipeline is `@mcp-abap-adt/auth-broker`.
```

- [ ] **Step 3: Verify README renders**

Manual: open `README.md` in editor, sanity-check markdown.

- [ ] **Step 4: Commit**

```bash
git add .env.example README.md
git commit -m "docs: document CALM_AUTH_FLOW + mcp-auth setup"
```

---

### Task 8: Live-tenant verification

**Files:** none (verification only)

- [ ] **Step 1: Confirm `.env` still has working `CALM_UAA_*` from prior session**

Run: `grep -E 'CALM_(MODE|BASE_URL|UAA_|AUTH_FLOW)' .env`
Expected: `CALM_MODE=oauth2`, `CALM_BASE_URL`, three `CALM_UAA_*` populated. `CALM_AUTH_FLOW` absent (so default cc).

- [ ] **Step 2: Run full test suite (back-compat path)**

Run: `npm test -- --runInBand`
Expected: same outcome as before this plan started — 194+ tests pass, sandbox suites skip (no `CALM_API_KEY`), `processMonitoring.oauth2.test.ts` still fails (live-tenant 404 — pre-existing, not our regression).

- [ ] **Step 3: Run smoke against built dist**

Run: `npm run build && node scripts/smoke-mcp.mjs`
Expected: connects, lists tools, the four read-only calls succeed (analytics providers, statuses, priorities, projects). Identical to pre-refactor behavior.

- [ ] **Step 4: Verify file-based path with mcp-auth-generated env**

```bash
mv .env .env.bak
cat > .env <<EOF
CALM_MODE=oauth2
CALM_BASE_URL=$(grep '^CALM_BASE_URL' .env.bak | cut -d= -f2)
CALM_AUTH_FLOW=client_credentials
CALM_DESTINATION=DEFAULT
EOF
# DEFAULT.env already exists from prior `mcp-auth --credential` experiment
node scripts/smoke-mcp.mjs
```
Expected: smoke connects successfully — broker now reads tokens from `./DEFAULT.env`.

Restore: `mv .env.bak .env`

- [ ] **Step 5: Commit any docs touchup discovered during verification**

If verification surfaced doc bugs, add fixup commit:
```bash
git add <files>
git commit -m "docs: fix discovered during live verification"
```

If everything works as-is, no commit needed.

---

## Verification of done

- [ ] All Tasks 1–8 boxes checked.
- [ ] `git log --oneline origin/main..HEAD` shows 7–8 commits with clear messages.
- [ ] `npm test -- --runInBand` green (same pass/fail/skip counts as Task 8 Step 2).
- [ ] `npm run build` green (no TS errors).
- [ ] `node scripts/smoke-mcp.mjs` works with both inline `.env` (back-compat) AND `DEFAULT.env`-only `.env` (broker file-based).
- [ ] `src/server/buildClient.ts` no longer contains the string `XsuaaRefresher`.
- [ ] `src/server/auth/buildBroker.ts` and `src/server/auth/legacyEnvShim.ts` exist with matching tests.
- [ ] README has an "Authentication setup" section.

If all checked → push and open PR for review. If any item fails → fix in place, do not paper over with conditionals.
