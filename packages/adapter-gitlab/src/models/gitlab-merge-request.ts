import { PullRequest } from "@git-mcp/core";
import type {
  PrState, User, Label, PrUpdates, MergeOptions, MergeResult,
  PrNote, DiffSet, PrDiff, PaginatedList,
} from "@git-mcp/core";
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

export class GitLabMergeRequest extends PullRequest {
  constructor(private readonly data: Record<string, unknown>, private readonly http: GitLabHttpClient) { super(); }
  get id(): string { return String(this.data.id); }
  get iid(): number { return this.data.iid as number; }
  get title(): string { return this.data.title as string; }
  get description(): string { return (this.data.description as string) ?? ""; }
  get state(): PrState {
    const s = this.data.state as string;
    if (s === "merged") return "merged";
    return s === "opened" ? "open" : "closed";
  }
  set state(_: PrState) {}
  get sourceBranch(): string { return this.data.source_branch as string; }
  get targetBranch(): string { return this.data.target_branch as string; }
  get createdAt(): string { return this.data.created_at as string; }
  get updatedAt(): string { return this.data.updated_at as string; }
  get webUrl(): string { return this.data.web_url as string; }
  get repository(): string { return String(this.data.project_id); }
  get author(): User { return mapUser(this.data.author); }
  get assignees(): User[] { return ((this.data.assignees as any[]) ?? []).map(mapUser); }
  get labels(): Label[] {
    return ((this.data.labels as any[]) ?? []).map((l: any) => ({ id: String(l), name: l as string, color: "000000", description: null }));
  }
  get rawData() { return this.data; }

  async merge(options?: MergeOptions): Promise<MergeResult> {
    const result = await this.http.request<Record<string, unknown>>(
      "PUT", `/projects/${encodeURIComponent(this.repository)}/merge_requests/${this.iid}/merge`,
      { body: JSON.stringify({ squash: options?.method === "squash" }) },
    );
    return { sha: result.sha as string, merged: result.state === "merged", message: (result.status as string) ?? "" };
  }
  async close(): Promise<void> {
    await this.http.request("PUT", `/projects/${encodeURIComponent(this.repository)}/merge_requests/${this.iid}`, { body: JSON.stringify({ state_event: "close" }) });
  }
  async reopen(): Promise<void> {
    await this.http.request("PUT", `/projects/${encodeURIComponent(this.repository)}/merge_requests/${this.iid}`, { body: JSON.stringify({ state_event: "reopen" }) });
  }
  async update(changes: PrUpdates): Promise<this> {
    await this.http.request("PUT", `/projects/${encodeURIComponent(this.repository)}/merge_requests/${this.iid}`, { body: JSON.stringify(changes) });
    return this;
  }
  async notes(): Promise<PaginatedList<PrNote>> {
    const data = await this.http.request<any[]>("GET", `/projects/${encodeURIComponent(this.repository)}/merge_requests/${this.iid}/notes`);
    return makeList(data.map((n: any) => ({ id: String(n.id), body: n.body, author: mapUser(n.author), createdAt: n.created_at })));
  }
  async diffs(): Promise<DiffSet> {
    const data = await this.http.request<{ changes: any[] }>("GET", `/projects/${encodeURIComponent(this.repository)}/merge_requests/${this.iid}/changes`);
    const diffs: PrDiff[] = (data.changes ?? []).map((c: any) => ({
      oldPath: c.old_path, newPath: c.new_path, diff: c.diff ?? "",
      newFile: c.new_file === true, deletedFile: c.deleted_file === true, renamedFile: c.renamed_file === true,
      additions: c.additions as number ?? 0, deletions: c.deletions as number ?? 0,
    }));
    const stats = diffs.reduce((acc, d) => ({ additions: acc.additions + d.additions, deletions: acc.deletions + d.deletions, changedFiles: acc.changedFiles + 1 }), { additions: 0, deletions: 0, changedFiles: 0 });
    return { files: diffs, stats };
  }
  async approvalState(): Promise<unknown> {
    return this.http.request("GET", `/projects/${encodeURIComponent(this.repository)}/merge_requests/${this.iid}/approval_state`);
  }
}
