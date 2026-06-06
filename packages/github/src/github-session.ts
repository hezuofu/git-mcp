import type { AuthenticatedSession, User } from "@git-mcp/core";

export class GitHubSession implements AuthenticatedSession {
  readonly platform = "github" as const;
  user: User | null = null;
  readonly createdAt = new Date();
  readonly expiresAt = null;
  readonly canRefresh = false;

  constructor(private readonly token: string) {}

  sign(headers: Record<string, string>): void {
    headers["Authorization"] = `Bearer ${this.token}`;
    headers["Accept"] = "application/vnd.github+json";
    headers["X-GitHub-Api-Version"] = "2022-11-28";
  }

  async refresh(): Promise<AuthenticatedSession> {
    throw new Error("GitHub PAT does not support refresh. Generate a new token if needed.");
  }
}
