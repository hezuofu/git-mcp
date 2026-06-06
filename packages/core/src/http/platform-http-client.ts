import type { ConnectionPool } from "../pool/connection-pool.js";
import type { AuthenticatedSession } from "../types/auth.js";

const VERSION = "0.1.0";

export interface RequestOptions {
  headers?: Record<string, string>;
  body?: string;
}

export abstract class PlatformHttpClient {
  constructor(
    readonly baseUrl: string,
    protected readonly session: AuthenticatedSession,
    protected readonly pool: ConnectionPool,
  ) {}

  abstract request<T>(method: string, path: string, options?: RequestOptions): Promise<T>;

  protected addDefaultHeaders(headers: Record<string, string>): void {
    headers["Content-Type"] = "application/json";
    headers["User-Agent"] = `git-mcp/${VERSION}`;
  }

  protected signRequest(headers: Record<string, string>): void {
    this.session.sign(headers);
  }

  protected abstract buildApiError(statusCode: number, body: unknown, headers?: Record<string, string>): Error;
}
