#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import { runStdio } from '../server/runStdio';
import { StderrLogger } from '../server/stderrLogger';

// `help` and `version` answer and exit before the server starts, like every
// CLI in the family; only then does stdout belong to the MCP protocol.
const first = process.argv[2];
if (first === 'version' || first === '--version' || first === '-v') {
  const manifest = path.resolve(__dirname, '../../package.json');
  console.log(
    (JSON.parse(fs.readFileSync(manifest, 'utf8')) as { version: string })
      .version,
  );
  process.exit(0);
}
if (first === 'help' || first === '--help' || first === '-h') {
  console.log(`calm-mcp — MCP server for SAP Cloud ALM, over stdio

Usage: calm-mcp [help | version]

Configuration comes from the environment (or an MCP client's "env"):
  CALM_MODE              oauth2 | sandbox (required)
  CALM_BASE_URL          tenant URL (sandbox defaults to the SAP API Hub)
  CALM_UAA_URL           UAA / XSUAA URL                  (oauth2)
  CALM_UAA_CLIENT_ID     client id                        (oauth2)
  CALM_UAA_CLIENT_SECRET client secret                    (oauth2)
  CALM_AUTH_FLOW         client_credentials | authorization_code
  CALM_DESTINATION       destination for the auth-broker stores
  CALM_API_KEY           API key                          (sandbox)
  CALM_LOG_LEVEL         error | warn | info | debug

Commands:
  help, --help, -h       Show this help
  version, --version, -v Show version number

See the README for the full setup.`);
  process.exit(0);
}

runStdio().catch((err: unknown) => {
  // runStdio() may fail before its own logger is wired (config throws,
  // missing env, etc.), so the catch block keeps a separate logger.
  // StderrLogger guarantees we never write to stdout — keeping the
  // MCP-stdio contract intact even on startup failure.
  const logger = new StderrLogger();
  const msg = err instanceof Error ? err.message : String(err);
  logger.error(`[calm-mcp] startup failed: ${msg}`, {
    stack: err instanceof Error ? err.stack : undefined,
  });
  process.exit(1);
});
