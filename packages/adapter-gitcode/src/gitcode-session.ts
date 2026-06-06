import type { AuthenticatedSession, User } from "@git-mcp/core";

export class GitCodeSession implements AuthenticatedSession {
  readonly platform = "gitcode" as const;
  user: User | null = null;
  readonly createdAt = new Date();
  readonly expiresAt = null;
  readonly canRefresh = false;

  constructor(private readonly token: string) {}

  sign(headers: Record<string, string>): void {
    // GitCode supports both Bearer and PRIVATE-TOKEN
    headers["Authorization"] = `Bearer ${this.token}`;
  }

  async refresh(): Promise<AuthenticatedSession> {
    throw new Error("GitCode token does not support refresh.");
  }
}
