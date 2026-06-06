import { Issue } from "@git-mcp/core";
import type { IssueState, User, Label, IssueUpdates, PaginatedList, IssueNote } from "@git-mcp/core";
import type { GitLabHttpClient } from "../gitlab-http-client.js";

function mapUser(u: any): User {
  return { id: String(u.id), username: u.username, name: u.name, email: null, avatarUrl: u.avatar_url, platform: "gitlab" };
}

function makeList<T>(items: T[]): PaginatedList<T> {
  return {
    items, totalCount: items.length, pageInfo: { currentPage: 1, perPage: 100 },
    nextPage: async () => null, hasMore: () => false,
    [Symbol.asyncIterator]() { return items[Symbol.iterator]() as any; },
  } as unknown as PaginatedList<T>;
}

export class GitLabIssue extends Issue {
  constructor(private readonly data: Record<string, unknown>, private readonly http: GitLabHttpClient) { super(); }
  get id(): string { return String(this.data.id); }
  get iid(): number { return this.data.iid as number; }
  get title(): string { return this.data.title as string; }
  get description(): string { return (this.data.description as string) ?? ""; }
  get state(): IssueState { return this.data.state === "opened" ? "open" : "closed"; }
  set state(_: IssueState) {}
  get createdAt(): string { return this.data.created_at as string; }
  get updatedAt(): string { return this.data.updated_at as string; }
  get webUrl(): string { return this.data.web_url as string; }
  get repository(): string { return String(this.data.project_id); }
  get author(): User { return mapUser(this.data.author); }
  get assignees(): User[] { return ((this.data.assignees as any[]) ?? []).map(mapUser); }
  get labels(): Label[] { return ((this.data.labels as any[]) ?? []).map((l: any) => ({ id: String(l), name: l as string, color: "000000", description: null })); }
  get rawData() { return this.data; }

  async close(): Promise<void> { await this.http.request("PUT", `/projects/${encodeURIComponent(this.repository)}/issues/${this.iid}`, { body: JSON.stringify({ state_event: "close" }) }); }
  async reopen(): Promise<void> { await this.http.request("PUT", `/projects/${encodeURIComponent(this.repository)}/issues/${this.iid}`, { body: JSON.stringify({ state_event: "reopen" }) }); }
  async update(changes: IssueUpdates): Promise<this> { await this.http.request("PUT", `/projects/${encodeURIComponent(this.repository)}/issues/${this.iid}`, { body: JSON.stringify(changes) }); return this; }
  async addLabel(label: string): Promise<void> { await this.http.request("PUT", `/projects/${encodeURIComponent(this.repository)}/issues/${this.iid}`, { body: JSON.stringify({ add_labels: label }) }); }
  async removeLabel(label: string): Promise<void> { await this.http.request("PUT", `/projects/${encodeURIComponent(this.repository)}/issues/${this.iid}`, { body: JSON.stringify({ remove_labels: label }) }); }
  async notes(): Promise<PaginatedList<IssueNote>> {
    const data = await this.http.request<any[]>("GET", `/projects/${encodeURIComponent(this.repository)}/issues/${this.iid}/notes`);
    return makeList(data.map((n: any) => ({ id: String(n.id), body: n.body, author: mapUser(n.author), createdAt: n.created_at })));
  }
  async createNote(body: string): Promise<IssueNote> {
    const result = await this.http.request<Record<string, unknown>>("POST", `/projects/${encodeURIComponent(this.repository)}/issues/${this.iid}/notes`, { body: JSON.stringify({ body }) });
    return { id: String(result.id), body: result.body as string, author: mapUser((result as any).author), createdAt: result.created_at as string };
  }
}
