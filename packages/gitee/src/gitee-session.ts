import type { AuthenticatedSession, User } from "@git-mcp/core";

export class GiteeSession implements AuthenticatedSession {
  readonly platform = "gitee" as const;
  user: User | null = null;
  readonly createdAt = new Date();
  readonly expiresAt = null;
  readonly canRefresh = false;

  constructor(private readonly token: string) {}

  sign(headers: Record<string, string>): void {
    // Gitee uses ?access_token= query param OR the token in request body.
    // For header-based auth we use: "Authorization: token <token>" style.
    headers["Authorization"] = `token ${this.token}`;
  }

  async refresh(): Promise<AuthenticatedSession> {
    throw new Error("Gitee token does not support refresh.");
  }
}
