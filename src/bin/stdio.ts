#!/usr/bin/env node
import { runStdio } from '../server/runStdio';

runStdio().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  // All diagnostic output on stderr — stdout is reserved for the MCP
  // protocol stream.
  process.stderr.write(`[calm-mcp] startup failed: ${msg}\n`);
  if (err instanceof Error && err.stack) {
    process.stderr.write(`${err.stack}\n`);
  }
  process.exit(1);
});
