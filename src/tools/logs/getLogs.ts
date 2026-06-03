import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';
import { decodeOtlpLogs } from './otlpLogs';

export interface IGetLogsArgs {
  provider: string;
  serviceId?: string;
  category?: string;
  version?: string;
  format?: string;
  from?: string;
  to?: string;
  period?: string;
  limit?: number;
  offset?: number;
  onLimit?: string;
  raw?: boolean;
}

export interface IGetLogsResult {
  records: unknown;
  /** Present only when the body was returned undecoded (`raw: true`). */
  encoding?: 'base64';
}

const definition: ICalmToolDefinition = {
  name: 'calm_logs_get',
  description:
    'Fetch application logs from Cloud ALM Logs (OpenTelemetry-style). Unlike other Cloud ALM services, Logs uses a domain-specific REST query (not OData). `provider` is required; filter by `serviceId`, or a time window via `from`/`to` (ISO timestamps) or `period`. The Logs API returns an OTLP `application/x-protobuf` body; this tool decodes it into canonical OTLP JSON under `records` (`{ resourceLogs: [...] }`). Set `raw: true` to instead get the undecoded protobuf as a base64 string.',
  inputSchema: {
    type: 'object',
    required: ['provider'],
    properties: {
      provider: { type: 'string', description: 'Log provider name.' },
      serviceId: {
        type: 'string',
        description:
          'Service id filter, emitted as a plain `serviceId` query param. The live Logs API requires it alongside `provider` and rejects a request without it (HTTP 428).',
      },
      category: {
        type: 'string',
        description:
          'Domain-specific log-category filter, emitted as a plain `category` query param (e.g. "ABAP Runtime"). The live Logs API owns the set of valid category names; forwarded verbatim.',
      },
      version: {
        type: 'string',
        description:
          'Logs API query version (e.g. "V1"), forwarded as a `version` query param. Only set if the tenant expects a specific version; omit to use the API default.',
      },
      format: {
        type: 'string',
        description:
          'Forwarded as a `format` query param (e.g. "protobuf-json"). NOTE: on the wire the Logs API has so far always responded `application/x-protobuf` regardless of this value, and the tool decodes that into OTLP JSON anyway — pass it only to probe/override server behaviour, not to change the decoded output shape.',
      },
      from: { type: 'string', description: 'ISO timestamp, inclusive start.' },
      to: { type: 'string', description: 'ISO timestamp, exclusive end.' },
      period: {
        type: 'string',
        description:
          'Period shorthand in the Logs API format `<n>M` minutes (e.g. "10M" = last 10 minutes), NOT "1h"/"24h". Alternative to from/to. Wide windows can exceed the server count cap (HTTP 403) — narrow the period.',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 1000,
        description:
          'Max records to return. The Logs API only honours this together with the count-cap strategy — the client auto-sets `onLimit="truncate"` when `limit` is given, so paging works out of the box.',
      },
      offset: { type: 'integer', minimum: 0 },
      onLimit: {
        type: 'string',
        description:
          'Server-side count-cap strategy. Defaults to "truncate" when `limit`/`offset` is set (the only value that returns data on a window over the cap; otherwise the API responds HTTP 403). Override only if you know another value the tenant accepts.',
      },
      raw: {
        type: 'boolean',
        description:
          'When true, return the undecoded OTLP protobuf body as a base64 string (with `encoding: "base64"`) instead of decoded JSON. For debugging or feeding another OTLP consumer.',
      },
    },
  },
};

const handler: CalmToolHandler<IGetLogsArgs, IGetLogsResult> = async (
  ctx,
  args,
) => {
  if (!args?.provider) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'provider is required',
    });
  }
  try {
    const body = await ctx.calm.getLogs().get({
      provider: args.provider,
      serviceId: args.serviceId,
      category: args.category,
      version: args.version,
      format: args.format,
      from: args.from,
      to: args.to,
      period: args.period,
      limit: args.limit,
      offset: args.offset,
      onLimit: args.onLimit,
    });

    // The Logs API returns OTLP `application/x-protobuf` (delivered as a
    // Buffer by the connection) when there are records, and a plain JSON
    // body (e.g. `{}`) when the window is empty. Decode the former into
    // canonical OTLP JSON; pass anything non-binary through unchanged.
    const bytes = asBytes(body);
    if (!bytes) {
      return { records: body };
    }
    if (args.raw) {
      return {
        records: Buffer.from(bytes).toString('base64'),
        encoding: 'base64',
      };
    }
    return { records: decodeOtlpLogs(bytes) };
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

function asBytes(body: unknown): Uint8Array | undefined {
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return body;
  return undefined;
}

export const getLogsTool: ICalmHandlerEntry<IGetLogsArgs, IGetLogsResult> = {
  toolDefinition: definition,
  handler,
};
