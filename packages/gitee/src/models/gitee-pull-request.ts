import { PullRequest } from "@git-mcp/core";
import type { PrState, User, Label, PrUpdates, MergeOptions, MergeResult, PrNote, DiffSet, PrDiff, PaginatedList } from "@git-mcp/core";
import type { GiteeHttpClient } from "../gitee-http-client.js";

function mapUser(u: any): User {
  return { id: String(u.id), username: u.login, name: u.name, email: null, avatarUrl: u.avatar_url, platform: "gitee" };
}
function makeList<T>(items: T[]): PaginatedList<T> {
  return { items, totalCount: items.length, pageInfo: { currentPage: 1, perPage: 100 }, nextPage: async () => null, hasMore: () => false, [Symbol.asyncIterator]() { return items[Symbol.iterator]() as any; } } as unknown as PaginatedList<T>;
}

export class GiteePullRequest extends PullRequest {
  constructor(private readonly data: Record<string, unknown>, private readonly http: GiteeHttpClient) { super(); }
  get id(): string { return String(this.data.id); }
  get iid(): number { return this.data.number as number; }
  get title(): string { return this.data.title as string; }
  get description(): string { return (this.data.body as string) ?? ""; }
  get state(): PrState { const s = this.data.state as string; if (s === "merged") return "merged"; return s === "open" ? "open" : "closed"; }
  set state(_: PrState) {}
  get sourceBranch(): string { return (this.data.head as any)?.ref as string ?? (this.data as any).source_branch as string; }
  get targetBranch(): string { return (this.data.base as any)?.ref as string ?? (this.data as any).target_branch as string; }
  get createdAt(): string { return this.data.created_at as string; }
  get updatedAt(): string { return this.data.updated_at as string; }
  get webUrl(): string { return this.data.html_url as string; }
  get repository(): string { return (this.data.base as any)?.repo?.full_name as string ?? (this.data as any).repository?.full_name as string ?? ""; }
  get author(): User { return mapUser(this.data.user); }
  get assignees(): User[] { return ((this.data.assignees as any[]) ?? []).map(mapUser); }
  get labels(): Label[] { return ((this.data.labels as any[]) ?? []).map((l: any) => ({ id: String(l.id ?? l.name), name: l.name, color: l.color ?? "000000", description: l.description ?? null })); }
  get rawData() { return this.data; }

  async merge(options?: MergeOptions): Promise<MergeResult> {
    const result = await this.http.request<Record<string, unknown>>("PUT", `/repos/${this.repository}/pulls/${this.iid}/merge`, {
      body: JSON.stringify({ merge_method: options?.method ?? "merge" }),
    });
    return { sha: (result.sha as string) ?? "", merged: true, message: (result.message as string) ?? "" };
  }
  async close(): Promise<void> { await this.http.request("PATCH", `/repos/${this.repository}/pulls/${this.iid}`, { body: JSON.stringify({ state: "closed" }) }); }
  async reopen(): Promise<void> { await this.http.request("PATCH", `/repos/${this.repository}/pulls/${this.iid}`, { body: JSON.stringify({ state: "open" }) }); }
  async update(changes: PrUpdates): Promise<this> { await this.http.request("PATCH", `/repos/${this.repository}/pulls/${this.iid}`, { body: JSON.stringify(changes) }); return this; }
  async notes(): Promise<PaginatedList<PrNote>> {
    const comments = await this.http.request<any[]>("GET", `/repos/${this.repository}/pulls/${this.iid}/comments`);
    return makeList(comments.map((c: any) => ({ id: String(c.id), body: c.body, author: mapUser(c.user), createdAt: c.created_at })));
  }
  async diffs(): Promise<DiffSet> {
    const files = await this.http.request<any[]>("GET", `/repos/${this.repository}/pulls/${this.iid}/files?per_page=100`);
    const diffs: PrDiff[] = files.map((f: any) => ({
      oldPath: f.filename, newPath: f.filename, diff: f.patch ?? "",
      newFile: f.status === "added", deletedFile: f.status === "removed", renamedFile: f.status === "renamed",
      additions: f.additions as number ?? 0, deletions: f.deletions as number ?? 0,
    }));
    const stats = diffs.reduce((acc, d) => ({ additions: acc.additions + d.additions, deletions: acc.deletions + d.deletions, changedFiles: acc.changedFiles + 1 }), { additions: 0, deletions: 0, changedFiles: 0 });
    return { files: diffs, stats };
  }
  async approvalState(): Promise<unknown> { return { approved: false, approvedBy: [], requiredCount: 0, currentCount: 0 }; }
}
