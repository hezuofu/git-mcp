import { PlatformHttpClient } from "@git-mcp/core";
import type { ConnectionPool, AuthenticatedSession } from "@git-mcp/core";
import { GitHubApiError } from "./github-api-error.js";

export class GitHubHttpClient extends PlatformHttpClient {
  constructor(baseUrl: string, session: AuthenticatedSession, pool: ConnectionPool) {
    super(baseUrl, session, pool);
  }

  protected addDefaultHeaders(headers: Record<string, string>): void {
    super.addDefaultHeaders(headers);
    headers["Accept"] = "application/vnd.github+json";
    headers["X-GitHub-Api-Version"] = "2022-11-28";
  }

  protected buildApiError(statusCode: number, body: unknown): Error {
    return new GitHubApiError(statusCode, body);
  }
}
