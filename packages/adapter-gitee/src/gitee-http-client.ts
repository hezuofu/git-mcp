import { PlatformHttpClient } from "@git-mcp/core";
import type { ConnectionPool, AuthenticatedSession } from "@git-mcp/core";
import { GiteeApiError } from "./gitee-api-error.js";

export class GiteeHttpClient extends PlatformHttpClient {
  constructor(baseUrl: string, session: AuthenticatedSession, pool: ConnectionPool) {
    super(baseUrl, session, pool);
  }

  protected buildApiError(statusCode: number, body: unknown): Error {
    return new GiteeApiError(statusCode, body);
  }
}
