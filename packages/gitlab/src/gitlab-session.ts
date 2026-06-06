import type { AuthenticatedSession, User } from "@git-mcp/core";

export class GitLabSession implements AuthenticatedSession {
  readonly platform = "gitlab" as const;
  user: User | null = null;
  readonly createdAt = new Date();
  readonly expiresAt = null;
  readonly canRefresh = false;

  constructor(private readonly token: string, private readonly isOld: boolean = false) {}

  sign(headers: Record<string, string>): void {
    if (this.isOld) {
      headers["Private-Token"] = this.token;
    } else {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
  }

  async refresh(): Promise<AuthenticatedSession> {
    throw new Error("GitLab PAT does not support refresh. Use OAuth for refreshable tokens.");
  }
}
