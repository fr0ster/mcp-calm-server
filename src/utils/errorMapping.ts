import { CalmApiError } from '@mcp-abap-adt/calm-client';

/**
 * MCP-facing error shape. Thrown from tool handlers; caught by the
 * registry wrapper and surfaced as an MCP tool-call error to the LLM.
 *
 * The `code` stays machine-readable so the LLM can branch (retry vs
 * give up vs ask user). The `message` is user-facing — stripped of
 * stack traces and internal detail.
 */
export class CalmToolError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly serviceCode?: string;
  readonly cause?: unknown;

  constructor(opts: {
    code: string;
    message: string;
    status?: number;
    serviceCode?: string;
    cause?: unknown;
  }) {
    super(opts.message);
    this.name = 'CalmToolError';
    this.code = opts.code;
    this.status = opts.status;
    this.serviceCode = opts.serviceCode;
    if (opts.cause !== undefined) this.cause = opts.cause;
    Object.setPrototypeOf(this, CalmToolError.prototype);
  }
}

/**
 * Translate any thrown value from a CalmClient call into a
 * CalmToolError the LLM can reason about. CalmApiError codes become
 * LLM-friendly messages; other errors fall through as `UNKNOWN`.
 */
export function mapCalmErrorForTool(err: unknown): CalmToolError {
  if (err instanceof CalmApiError) {
    switch (err.code) {
      case 'NOT_FOUND':
        return new CalmToolError({
          code: 'NOT_FOUND',
          message: err.message,
          status: 404,
          cause: err,
        });
      case 'ODATA_ERROR':
        return new CalmToolError({
          code: 'ODATA_ERROR',
          message: `Cloud ALM rejected the request: ${err.message}`,
          status: err.status,
          serviceCode: err.serviceCode,
          cause: err,
        });
      case 'HTTP_ERROR':
        return new CalmToolError({
          code: 'HTTP_ERROR',
          message: `Cloud ALM returned HTTP ${err.status ?? '?'}: ${err.message.slice(0, 160)}`,
          status: err.status,
          cause: err,
        });
      case 'NETWORK':
        return new CalmToolError({
          code: 'NETWORK',
          message: 'Cloud ALM is unreachable — check connectivity and retry.',
          cause: err,
        });
      case 'JSON_PARSE':
        return new CalmToolError({
          code: 'JSON_PARSE',
          message:
            'Cloud ALM returned malformed JSON — likely a tenant configuration issue.',
          cause: err,
        });
      default:
        return new CalmToolError({
          code: 'UNKNOWN',
          message: err.message,
          status: err.status,
          cause: err,
        });
    }
  }
  return new CalmToolError({
    code: 'UNKNOWN',
    message: err instanceof Error ? err.message : String(err),
    cause: err,
  });
}
