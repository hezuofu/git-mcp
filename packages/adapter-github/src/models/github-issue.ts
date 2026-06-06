import { Issue } from "@git-mcp/core";
import type {
  IssueState, User, Label, IssueUpdates, PaginatedList, IssueNote,
} from "@git-mcp/core";
import type { GitHubHttpClient } from "../github-http-client.js";

function mapUser(u: any): User {
  return { id: String(u.id), username: u.login, name: u.login, email: null, avatarUrl: u.avatar_url, platform: "github" };
}

function makeList<T>(items: T[]): PaginatedList<T> {
  return {
    items, totalCount: items.length,
    pageInfo: { currentPage: 1, perPage: 100 },
    nextPage: async () => null, hasMore: () => false,
    [Symbol.asyncIterator]() { return items[Symbol.iterator]() as any; },
  } as unknown as PaginatedList<T>;
}

export class GitHubIssue extends Issue {
  constructor(
    private readonly data: Record<string, unknown>,
    private readonly http: GitHubHttpClient,
  ) { super(); }

  get id(): string { return String(this.data.id); }
  get iid(): number { return this.data.number as number; }
  get title(): string { return this.data.title as string; }
  get description(): string { return (this.data.body as string) ?? ""; }
  get state(): IssueState { return this.data.state === "open" ? "open" : "closed"; }
  set state(_: IssueState) {}
  get createdAt(): string { return this.data.created_at as string; }
  get updatedAt(): string { return this.data.updated_at as string; }
  get webUrl(): string { return this.data.html_url as string; }
  get repository(): string {
    const url = this.data.repository_url as string;
    return url?.replace("https://api.github.com/repos/", "") ?? "";
  }
  get author(): User { return mapUser(this.data.user); }
  get assignees(): User[] { return ((this.data.assignees as any[]) ?? []).map(mapUser); }
  get labels(): Label[] {
    return ((this.data.labels as any[]) ?? []).map((l: any) => ({
      id: String(l.id ?? l.name), name: l.name, color: l.color ?? "000000", description: l.description ?? null,
    }));
  }
  get rawData(): Record<string, unknown> { return this.data; }

  async close(): Promise<void> {
    await this.http.request("PATCH", `/repos/${this.repository}/issues/${this.iid}`, {
      body: JSON.stringify({ state: "closed" }),
    });
  }
  async reopen(): Promise<void> {
    await this.http.request("PATCH", `/repos/${this.repository}/issues/${this.iid}`, {
      body: JSON.stringify({ state: "open" }),
    });
  }
  async update(changes: IssueUpdates): Promise<this> {
    await this.http.request("PATCH", `/repos/${this.repository}/issues/${this.iid}`, {
      body: JSON.stringify(changes),
    });
    return this;
  }
  async addLabel(label: string): Promise<void> {
    await this.http.request("POST", `/repos/${this.repository}/issues/${this.iid}/labels`, {
      body: JSON.stringify({ labels: [label] }),
    });
  }
  async removeLabel(label: string): Promise<void> {
    await this.http.request("DELETE", `/repos/${this.repository}/issues/${this.iid}/labels/${encodeURIComponent(label)}`);
  }
  async notes(): Promise<PaginatedList<IssueNote>> {
    const comments = await this.http.request<any[]>("GET", `/repos/${this.repository}/issues/${this.iid}/comments`);
    return makeList(comments.map((c: any) => ({
      id: String(c.id), body: c.body, author: mapUser(c.user), createdAt: c.created_at,
    })));
  }
  async createNote(body: string): Promise<IssueNote> {
    const result = await this.http.request<Record<string, unknown>>(
      "POST", `/repos/${this.repository}/issues/${this.iid}/comments`,
      { body: JSON.stringify({ body }) },
    );
    return { id: String(result.id), body: result.body as string, author: mapUser((result as any).user), createdAt: result.created_at as string };
  }
}
