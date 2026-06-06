import { PlatformHttpClient } from "@git-mcp/core";
import type { ConnectionPool, AuthenticatedSession } from "@git-mcp/core";
import { GitCodeApiError } from "./gitcode-api-error.js";

export class GitCodeHttpClient extends PlatformHttpClient {
  constructor(baseUrl: string, session: AuthenticatedSession, pool: ConnectionPool) {
    super(baseUrl, session, pool);
  }

  protected buildApiError(statusCode: number, body: unknown): Error {
    return new GitCodeApiError(statusCode, body);
  }
}
