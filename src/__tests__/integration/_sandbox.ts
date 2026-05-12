import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CalmClient } from '@mcp-abap-adt/calm-client';
import { config as dotenvConfig } from 'dotenv';
import { buildCalmClient } from '../../server/buildClient';
import { readConfig } from '../../server/config';

const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) dotenvConfig({ path: envPath });

const ENABLED =
  process.env.CALM_MODE?.toLowerCase() === 'sandbox' &&
  !!process.env.CALM_API_KEY;

export const PROJECT_ID = process.env.CALM_PROJECT_ID;

let cachedCalm: CalmClient | undefined;
function calm(): CalmClient {
  if (cachedCalm) return cachedCalm;
  cachedCalm = buildCalmClient(readConfig());
  return cachedCalm;
}

export const describeSandbox = ENABLED ? describe : describe.skip;
export const describeWithProject =
  ENABLED && PROJECT_ID ? describe : describe.skip;

export const ctx = (): { calm: CalmClient } => ({ calm: calm() });

export const SANDBOX_NOTE = ENABLED
  ? `[sandbox enabled, projectId=${PROJECT_ID ?? '<not set>'}]`
  : '[sandbox disabled — set CALM_MODE=sandbox + CALM_API_KEY in .env]';
