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
    uaaClientId,
    uaaClientSecret,
  });
  return store;
}
