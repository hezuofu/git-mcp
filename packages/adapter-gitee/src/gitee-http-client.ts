import { PlatformHttpClient } from "@git-mcp/core";
import type { RequestOptions, ConnectionPool, AuthenticatedSession } from "@git-mcp/core";
import nodeFetch from "node-fetch";
import { GiteeApiError } from "./gitee-api-error.js";

export class GiteeHttpClient extends PlatformHttpClient {
  constructor(baseUrl: string, session: AuthenticatedSession, pool: ConnectionPool) {
    super(baseUrl, session, pool);
  }

  async request<T>(method: string, path: string, options?: RequestOptions): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {};
    this.signRequest(headers);
    this.addDefaultHeaders(headers);

    const response = await nodeFetch(url, {
      method, headers: { ...headers, ...options?.headers }, body: options?.body,
      agent: this.pool.getAgents(this.baseUrl).select(url),
    } as any);

    const body = await response.json() as any;
    if (!response.ok) throw this.buildApiError(response.status, body);
    return body as T;
  }

  protected buildApiError(statusCode: number, body: any): Error {
    return new GiteeApiError(statusCode, body);
  }
}
