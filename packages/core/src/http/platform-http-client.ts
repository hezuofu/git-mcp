import got, { HTTPError, TimeoutError, type Got, type Response as GotResponse } from "got";
import type { ConnectionPool } from "../pool/connection-pool.js";
import type { AuthenticatedSession } from "../types/auth.js";

const VERSION = "0.1.0";

export interface RequestOptions {
  headers?: Record<string, string>;
  body?: string;
  /** Override retry limit for this request */
  retryLimit?: number;
  /** Request timeout in ms (default 30000) */
  timeout?: number;
}

export abstract class PlatformHttpClient {
  private readonly gotInstance: Got;

  constructor(
    readonly baseUrl: string,
    protected readonly session: AuthenticatedSession,
    protected readonly pool: ConnectionPool,
  ) {
    const agents = pool.getAgents(baseUrl);

    this.gotInstance = got.extend({
      prefixUrl: baseUrl,
      retry: {
        limit: 2,
        statusCodes: [408, 413, 429, 500, 502, 503, 504],
      },
      timeout: { request: 30000 },
      hooks: {
        beforeRequest: [
          (options) => {
            const headers: Record<string, string> = {};
            this.signRequest(headers);
            this.addDefaultHeaders(headers);
            // Merge with existing headers
            for (const [k, v] of Object.entries(headers)) {
              (options.headers as Record<string, string>)[k] = v;
            }
          },
        ],
        beforeRetry: [
          async (_err, _count) => {
            // On 401, attempt OAuth token refresh before retry
            if (_err instanceof HTTPError && _err.response?.statusCode === 401 && this.session.canRefresh) {
              await this.session.refresh();
            }
          },
        ],
      },
      // Use our pooled agents for keep-alive and proxy support
      agent: {
        http: agents.http,
        https: agents.https,
      },
    });
  }

  /** Expose got instance for platform-specific customization */
  protected get got(): Got {
    return this.gotInstance;
  }

  async request<T>(method: string, path: string, options?: RequestOptions): Promise<T> {
    const reqOpts: any = {
      method,
      headers: options?.headers ?? {},
    };

    if (options?.body) {
      reqOpts.body = options.body;
    }
    if (options?.retryLimit !== undefined) {
      reqOpts.retry = { limit: options.retryLimit };
    }
    if (options?.timeout !== undefined) {
      reqOpts.timeout = { request: options.timeout };
    }

    try {
      const response: GotResponse<string> = await this.gotInstance(path, reqOpts);
      return JSON.parse(response.body) as T;
    } catch (err: any) {
      if (err instanceof HTTPError) {
        throw this.buildApiError(err.response.statusCode, JSON.parse(err.response.body as string), err.response.headers as Record<string, string>);
      }
      if (err instanceof TimeoutError) {
        throw new Error(`Request timeout: ${method} ${path}`);
      }
      throw err;
    }
  }

  /** Stream a binary response without parsing JSON */
  async stream(path: string): Promise<GotResponse<Buffer>> {
    return this.gotInstance.get(path, { responseType: "buffer" });
  }

  /**
   * Create a paginated iterator using got's built-in Link header pagination.
   * Returns items from all pages.
   */
  async *requestPaginated<T>(method: "GET" | "POST", path: string): AsyncIterable<T> {
    const paginate = this.gotInstance.paginate<T>(path, { method, pagination: { transform: (r: GotResponse) => JSON.parse(r.body as string) } });
    for await (const item of paginate) {
      yield item;
    }
  }

  protected addDefaultHeaders(headers: Record<string, string>): void {
    headers["Content-Type"] = "application/json";
    headers["User-Agent"] = `git-mcp/${VERSION}`;
  }

  protected signRequest(headers: Record<string, string>): void {
    this.session.sign(headers);
  }

  protected abstract buildApiError(statusCode: number, body: unknown, headers?: Record<string, string>): Error;
}
