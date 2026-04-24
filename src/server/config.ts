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
  const path = resolve(process.cwd(), '.env');
  if (existsSync(path)) dotenvConfig({ path });
  loaded = true;
}

export type CalmServerMode = 'oauth2' | 'sandbox';

export interface ICalmServerConfig {
  mode: CalmServerMode;
  baseUrl: string;
  uaaUrl?: string;
  uaaClientId?: string;
  uaaClientSecret?: string;
  apiKey?: string;
  timeoutMs: number;
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
  const timeoutMs = process.env.CALM_TIMEOUT
    ? Number(process.env.CALM_TIMEOUT)
    : 30_000;

  if (mode === 'oauth2') {
    return {
      mode,
      baseUrl: required('CALM_BASE_URL'),
      uaaUrl: required('CALM_UAA_URL'),
      uaaClientId: required('CALM_UAA_CLIENT_ID'),
      uaaClientSecret: required('CALM_UAA_CLIENT_SECRET'),
      timeoutMs,
    };
  }
  if (mode === 'sandbox') {
    return {
      mode,
      baseUrl:
        process.env.CALM_BASE_URL || 'https://sandbox.api.sap.com/SAPCALM',
      apiKey: required('CALM_API_KEY'),
      timeoutMs,
    };
  }
  throw new Error(`[calm-mcp] unknown CALM_MODE "${mode}"`);
}
