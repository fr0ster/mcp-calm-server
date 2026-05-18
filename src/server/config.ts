import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as dotenvConfig } from 'dotenv';

let loaded = false;

/**
 * Load a `.env` file at the process cwd (idempotent). When launched as
 * `npx calm-mcp` from a project directory, the `.env` of that project
 * is picked up automatically.
 */
export function loadEnv(): void {
  if (loaded) return;
  loaded = true;
  // Under Jest, never auto-load a cwd-level .env: unit tests assert on
  // the absence of CALM_* vars, and a developer's local sandbox .env
  // would otherwise leak into that suite and make assertions flaky.
  // Smoke scripts and the stdio bin explicitly call dotenvConfig themselves.
  if (process.env.JEST_WORKER_ID) return;
  const path = resolve(process.cwd(), '.env');
  if (existsSync(path)) dotenvConfig({ path });
}

export type CalmServerMode = 'oauth2' | 'sandbox';
export type CalmAuthFlow = 'client_credentials' | 'authorization_code';

export interface ICalmServerConfig {
  mode: CalmServerMode;
  baseUrl: string;
  uaaUrl?: string;
  uaaClientId?: string;
  uaaClientSecret?: string;
  apiKey?: string;
  timeoutMs: number;
  authFlow: CalmAuthFlow;
  destination: string;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `[calm-mcp] env var ${name} is required but missing. See .env.example.`,
    );
  }
  return v;
}

export function readConfig(): ICalmServerConfig {
  loadEnv();
  const mode = process.env.CALM_MODE?.toLowerCase() as
    | CalmServerMode
    | undefined;
  if (!mode) {
    throw new Error(
      '[calm-mcp] CALM_MODE is required (oauth2 or sandbox). See .env.example.',
    );
  }
  const rawAuthFlow = process.env.CALM_AUTH_FLOW;
  let authFlow: CalmAuthFlow = 'client_credentials';
  if (rawAuthFlow) {
    if (
      rawAuthFlow === 'client_credentials' ||
      rawAuthFlow === 'authorization_code'
    ) {
      authFlow = rawAuthFlow;
    } else {
      throw new Error(
        `[calm-mcp] CALM_AUTH_FLOW must be 'client_credentials' or 'authorization_code', got "${rawAuthFlow}".`,
      );
    }
  }
  const destination = process.env.CALM_DESTINATION || 'DEFAULT';

  const timeoutMs = process.env.CALM_TIMEOUT
    ? Number(process.env.CALM_TIMEOUT)
    : 30_000;

  if (mode === 'oauth2') {
    return {
      mode,
      baseUrl: required('CALM_BASE_URL'),
      uaaUrl: process.env.CALM_UAA_URL,
      uaaClientId: process.env.CALM_UAA_CLIENT_ID,
      uaaClientSecret: process.env.CALM_UAA_CLIENT_SECRET,
      timeoutMs,
      authFlow,
      destination,
    };
  }
  if (mode === 'sandbox') {
    return {
      mode,
      baseUrl:
        process.env.CALM_BASE_URL || 'https://sandbox.api.sap.com/SAPCALM',
      apiKey: required('CALM_API_KEY'),
      timeoutMs,
      authFlow,
      destination,
    };
  }
  throw new Error(`[calm-mcp] unknown CALM_MODE "${mode}"`);
}
