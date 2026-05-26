import { CalmApiError, calmErrorFromBody } from '@mcp-abap-adt/calm-client';
import type {
  CalmService,
  ICalmConnection,
  ICalmRequestOptions,
  ICalmResponse,
  ILogger,
} from '@mcp-abap-adt/interfaces';
import {
  type CalmServiceRouteMap,
  DEFAULT_CALM_SERVICE_ROUTES,
} from './serviceRoutes';

export interface IAbstractCalmConnectionOptions {
  baseUrl: string;
  defaultTimeout?: number;
  serviceRoutes?: Partial<CalmServiceRouteMap>;
  defaultHeaders?: Record<string, string>;
  /**
   * Optional logger. Request lifecycle is logged at `debug`; transport
   * failures at `warn`. In a stdio MCP runtime this MUST be a
   * stderr-only logger (see `StderrLogger`) — never one that writes to
   * stdout.
   */
  logger?: ILogger;
}

function trimTrailingSlash(v: string): string {
  return v.endsWith('/') ? v.slice(0, -1) : v;
}
function trimLeadingSlash(v: string): string {
  return v.startsWith('/') ? v.slice(1) : v;
}
function joinUrl(base: string, path: string): string {
  if (!path) return trimTrailingSlash(base);
  return `${trimTrailingSlash(base)}/${trimLeadingSlash(path)}`;
}
function toQueryString(params: unknown): string {
  if (!params || typeof params !== 'object') return '';
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
    if (v === undefined || v === null) continue;
    usp.append(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

/**
 * Shared fetch-based transport for Cloud ALM. Subclasses provide
 * `attachAuth()` and may override `onAuthFailure()`. `baseUrl` is used
 * verbatim — NO prefix injection.
 */
export abstract class AbstractCalmConnection implements ICalmConnection {
  protected readonly baseUrl: string;
  protected readonly defaultTimeout: number;
  protected readonly defaultHeaders: Record<string, string>;
  protected readonly serviceRoutes: CalmServiceRouteMap;
  protected readonly logger?: ILogger;

  constructor(options: IAbstractCalmConnectionOptions) {
    this.baseUrl = trimTrailingSlash(options.baseUrl);
    this.defaultTimeout = options.defaultTimeout ?? 30_000;
    this.defaultHeaders = {
      Accept: 'application/json',
      ...options.defaultHeaders,
    };
    this.serviceRoutes = {
      ...DEFAULT_CALM_SERVICE_ROUTES,
      ...options.serviceRoutes,
    };
    this.logger = options.logger;
  }

  /** Subclass: return auth headers for a request. */
  protected abstract attachAuth(): Promise<Record<string, string>>;

  /**
   * Subclass hook on 401/403. Return true to retry once. Default: no
   * retry.
   */
  protected async onAuthFailure(_status: number): Promise<boolean> {
    return false;
  }

  async connect(): Promise<void> {}

  async getBaseUrl(): Promise<string> {
    return this.baseUrl;
  }

  async getServiceUrl(service: CalmService): Promise<string> {
    return joinUrl(this.baseUrl, this.serviceRoutes[service]);
  }

  async makeRequest<T = unknown, D = unknown>(
    options: ICalmRequestOptions,
  ): Promise<ICalmResponse<T, D>> {
    const base = options.service
      ? await this.getServiceUrl(options.service)
      : this.baseUrl;
    const url = joinUrl(base, options.url) + toQueryString(options.params);

    this.logger?.debug(`[calm] ${options.method} ${url}`);
    try {
      return await this.execute<T, D>(url, options);
    } catch (err) {
      const status = err instanceof CalmApiError ? err.status : undefined;
      if (status !== undefined && (await this.onAuthFailure(status))) {
        this.logger?.debug(
          `[calm] ${status} from ${options.method} ${url} — refreshed auth, retrying once`,
        );
        // Retry once. The retry's own errors (network, abort, HTTP) go
        // through the same normalization — never escape as a raw error.
        try {
          return await this.execute<T, D>(url, options);
        } catch (retryErr) {
          throw this.logFail(
            options.method,
            url,
            this.normalizeError(retryErr),
          );
        }
      }
      throw this.logFail(options.method, url, this.normalizeError(err));
    }
  }

  private logFail(
    method: string,
    url: string,
    err: CalmApiError,
  ): CalmApiError {
    // HTTP statuses (403/404/4xx/5xx) are expected operational signals —
    // log at debug. Transport/network failures (no status) are logged at
    // warn since they usually indicate misconfiguration or outage.
    if (err.status === undefined) {
      this.logger?.warn(`[calm] ${method} ${url} failed: ${err.message}`);
    } else {
      this.logger?.debug(
        `[calm] ${method} ${url} -> ${err.status} (${err.code})`,
      );
    }
    return err;
  }

  private normalizeError(err: unknown): CalmApiError {
    if (err instanceof CalmApiError) return err;
    return CalmApiError.fromNetwork(
      err,
      err instanceof Error ? err.message : String(err),
    );
  }

  private async execute<T, D>(
    url: string,
    options: ICalmRequestOptions,
  ): Promise<ICalmResponse<T, D>> {
    const auth = await this.attachAuth();
    const headers = { ...this.defaultHeaders, ...auth, ...options.headers };
    const init: RequestInit = {
      method: options.method,
      headers,
      signal: AbortSignal.timeout(options.timeout ?? this.defaultTimeout),
    };
    if (options.data !== undefined) {
      init.body =
        typeof options.data === 'string'
          ? options.data
          : JSON.stringify(options.data);
      if (!('Content-Type' in headers) && !('content-type' in headers)) {
        (headers as Record<string, string>)['Content-Type'] =
          'application/json';
      }
    }

    const response = await fetch(url, init);
    // Read raw bytes once. Binary responses (e.g. the Logs OTLP
    // `application/x-protobuf` payload) must keep their exact bytes —
    // decoding through `response.text()` would mangle them via UTF-8 and
    // make protobuf undecodable. Textual responses are decoded + JSON-parsed
    // as before. Errors are always JSON/text, so decode them as text.
    const bytes = Buffer.from(await response.arrayBuffer());

    if (!response.ok) {
      const text = bytes.toString('utf8');
      const parsed = text ? safeJson(text) : undefined;
      throw calmErrorFromBody(response.status, parsed ?? text);
    }

    this.logger?.debug(`[calm] ${response.status} ${options.method} ${url}`);
    const outHeaders: Record<string, string> = {};
    response.headers.forEach((v, k) => {
      outHeaders[k] = v;
    });

    let data: unknown;
    if (isBinaryContentType(outHeaders['content-type'])) {
      data = bytes.length ? bytes : undefined;
    } else {
      const text = bytes.toString('utf8');
      data = text ? safeJson(text) : undefined;
    }
    return {
      data: data as T,
      status: response.status,
      statusText: response.statusText,
      headers: outHeaders,
    } as ICalmResponse<T, D>;
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * A response body is treated as raw bytes (returned as a `Buffer`) unless its
 * Content-Type is textual. Anything that isn't JSON / text / XML / form data —
 * notably `application/x-protobuf` and `application/octet-stream` — is binary.
 */
function isBinaryContentType(contentType: string | undefined): boolean {
  if (!contentType) return false;
  const ct = contentType.toLowerCase();
  return !(
    ct.includes('json') ||
    ct.startsWith('text/') ||
    ct.includes('xml') ||
    ct.includes('x-www-form-urlencoded')
  );
}
