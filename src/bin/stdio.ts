#!/usr/bin/env node
import { runStdio } from '../server/runStdio';
import { StderrLogger } from '../server/stderrLogger';

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
