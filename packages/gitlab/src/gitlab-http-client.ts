import { PlatformHttpClient } from "@git-mcp/core";
import type { ConnectionPool, AuthenticatedSession } from "@git-mcp/core";
import { GitLabApiError } from "./gitlab-api-error.js";

export class GitLabHttpClient extends PlatformHttpClient {
  constructor(baseUrl: string, session: AuthenticatedSession, pool: ConnectionPool) {
    super(baseUrl, session, pool);
  }

  protected buildApiError(statusCode: number, body: unknown, headers?: Record<string, string>): Error {
    return new GitLabApiError(statusCode, body, headers);
  }
}
