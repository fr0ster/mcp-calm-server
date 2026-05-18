import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CalmClient } from '@mcp-abap-adt/calm-client';
import { config as dotenvConfig } from 'dotenv';
import { buildCalmClient } from '../../server/buildClient';
import { readConfig } from '../../server/config';

const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) dotenvConfig({ path: envPath });

const mode = process.env.CALM_MODE?.toLowerCase();

const SANDBOX_ENABLED = mode === 'sandbox' && !!process.env.CALM_API_KEY;

// OAuth2 gate accepts either inline CALM_UAA_* (legacy shim path) or
// `./{destination}.env` produced by `mcp-auth` (broker-file path).
// Mirrors auth resolution in `src/server/auth/buildBroker.ts`.
const destination = process.env.CALM_DESTINATION || 'DEFAULT';
const destEnvPath = resolve(process.cwd(), `${destination}.env`);
const HAS_INLINE_UAA =
  !!process.env.CALM_UAA_URL &&
  !!process.env.CALM_UAA_CLIENT_ID &&
  !!process.env.CALM_UAA_CLIENT_SECRET;
const HAS_DEST_ENV = existsSync(destEnvPath);

const OAUTH2_ENABLED =
  mode === 'oauth2' &&
  !!process.env.CALM_BASE_URL &&
  (HAS_INLINE_UAA || HAS_DEST_ENV);
const LIVE_ENABLED = SANDBOX_ENABLED || OAUTH2_ENABLED;

export const PROJECT_ID = process.env.CALM_PROJECT_ID;

const ALLOW_MUTATIONS = process.env.CALM_ALLOW_MUTATIONS === '1';

let cachedCalm: Promise<CalmClient> | undefined;
function calm(): Promise<CalmClient> {
  if (!cachedCalm) cachedCalm = buildCalmClient(readConfig());
  return cachedCalm;
}

/**
 * Gate for **sandbox-only** tests (api.sap.com with an S-user API key).
 * Skips cleanly if `CALM_MODE !== sandbox` or `CALM_API_KEY` is unset.
 * Use when the test relies on sandbox semantics or known behaviour.
 */
export const describeSandbox = SANDBOX_ENABLED ? describe : describe.skip;

/**
 * Gate for tests that work against **either** mode (sandbox OR live
 * OAuth2 tenant). Skips only when neither is configured. Use for
 * read-side tests whose assertions hold regardless of where the data
 * comes from.
 */
export const describeWhenLive = LIVE_ENABLED ? describe : describe.skip;

/**
 * Gate for **live OAuth2 tenant** tests (XSUAA client_credentials).
 * Skips when CALM_MODE != oauth2 or any UAA env var is missing. Use
 * for tests that exercise endpoints absent from the sandbox catalog
 * (e.g. Business Processes), or where tenant-tier semantics differ.
 */
export const describeOAuth2 = OAUTH2_ENABLED ? describe : describe.skip;

/** Gated on a usable CALM_PROJECT_ID *and* an enabled live backend. */
export const describeWithProject =
  LIVE_ENABLED && PROJECT_ID ? describe : describe.skip;

/**
 * Gate for **mutation** tests (create / update / delete / post). Must
 * be explicitly opted in via `CALM_ALLOW_MUTATIONS=1` AND requires a
 * project id, so a casual local run never accidentally writes to the
 * shared sandbox or a production tenant.
 */
export const describeMutating =
  LIVE_ENABLED && PROJECT_ID && ALLOW_MUTATIONS ? describe : describe.skip;

export const ctx = async (): Promise<{ calm: CalmClient }> => ({
  calm: await calm(),
});

export const SANDBOX_NOTE = SANDBOX_ENABLED
  ? `[sandbox enabled, projectId=${PROJECT_ID ?? '<not set>'}]`
  : OAUTH2_ENABLED
    ? `[oauth2 enabled, projectId=${PROJECT_ID ?? '<not set>'}, mutations=${ALLOW_MUTATIONS}]`
    : '[no live backend — set CALM_MODE=sandbox+CALM_API_KEY or CALM_MODE=oauth2+UAA env in .env]';
