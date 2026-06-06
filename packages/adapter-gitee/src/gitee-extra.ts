import type { ITagCollection, IReleaseCollection, ICommitCollection, ISearchCollection, IPipelineCollection, ToolProvider, ToolDescriptor, PaginatedList, TagInfo, ReleaseInfo, CommitInfo, CodeSearchResult, User } from "@git-mcp/core";
import { z } from "zod";
import type { GiteeHttpClient } from "./gitee-http-client.js";

function makeList<T>(items: T[]): PaginatedList<T> { return { items, totalCount: items.length, pageInfo: { currentPage: 1, perPage: 100 }, nextPage: async () => null, hasMore: () => false, [Symbol.asyncIterator]() { return items[Symbol.iterator]() as any; } } as any; }
function mapUser(u: any, p: string): User { return { id: String(u.id), username: u.login, name: u.name ?? u.login, email: null, avatarUrl: u.avatar_url, platform: p as any }; }

// ── Tags ──
export class GiteeTagCollection implements ITagCollection {
  constructor(private readonly http: GiteeHttpClient) {}
  async list(repo: string): Promise<PaginatedList<TagInfo>> {
    const data = await this.http.request<any[]>("GET", `/repos/${repo}/tags?per_page=100`);
    return makeList(data.map((t: any) => ({ name: t.name, message: t.message ?? "", commitSha: (t.commit as any)?.sha ?? "", createdAt: "" })));
  }
  async get(repo: string, name: string): Promise<TagInfo> { const data = await this.http.request<any[]>("GET", `/repos/${repo}/tags?per_page=100`); const t = data.find(x => x.name === name); if (!t) throw new Error(`Tag ${name} not found`); return { name: t.name, message: t.message ?? "", commitSha: (t.commit as any)?.sha ?? "", createdAt: "" }; }
  async create(p: { repository: string; name: string; ref: string; message?: string }): Promise<TagInfo> { const r = await this.http.request<any>("POST", `/repos/${p.repository}/git/tags`, { body: JSON.stringify({ tag: p.name, message: p.message ?? p.name, object: p.ref, type: "commit" }) }); await this.http.request("POST", `/repos/${p.repository}/git/refs`, { body: JSON.stringify({ ref: `refs/tags/${p.name}`, sha: r.sha }) }); return { name: p.name, message: p.message ?? "", commitSha: r.sha, createdAt: "" }; }
  async delete(repo: string, name: string): Promise<void> { await this.http.request("DELETE", `/repos/${repo}/git/refs/tags/${encodeURIComponent(name)}`); }
}

export class GiteeTagProvider implements ToolProvider {
  constructor(private readonly c: GiteeTagCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_tags", description: "List tags", inputSchema: z.object({ repository: z.string() }), execute: async (i) => JSON.stringify(await this.c.list((i as any).repository)) },
    { action: "get_tag", description: "Get a tag", inputSchema: z.object({ repository: z.string(), name: z.string() }), execute: async (i) => JSON.stringify(await this.c.get((i as any).repository, (i as any).name)) },
    { action: "create_tag", description: "Create a tag", inputSchema: z.object({ repository: z.string(), name: z.string(), ref: z.string(), message: z.string().optional() }), execute: async (i) => JSON.stringify(await this.c.create(i as any)) },
    { action: "delete_tag", description: "Delete a tag", inputSchema: z.object({ repository: z.string(), name: z.string() }), execute: async (i) => { await this.c.delete((i as any).repository, (i as any).name); return "{}"; } },
  ]; }
}

// ── Releases ──
export class GiteeReleaseCollection implements IReleaseCollection {
  constructor(private readonly http: GiteeHttpClient) {}
  async list(repo: string): Promise<PaginatedList<ReleaseInfo>> {
    const data = await this.http.request<any[]>("GET", `/repos/${repo}/releases?per_page=100`);
    return makeList(data.map(r => ({ id: String(r.id), tagName: r.tag_name, name: r.name ?? "", description: r.body ?? "", createdAt: r.created_at, releasedAt: r.published_at ?? r.created_at, author: mapUser(r.author ?? {}, "gitee"), assets: ((r.assets as any[]) ?? []).map(a => ({ id: String(a.id ?? a.name), name: a.name, size: a.size ?? 0, downloadUrl: a.browser_download_url ?? a.url, contentType: a.content_type ?? "" })), rawData: r })));
  }
  async get(repo: string, tagName: string): Promise<ReleaseInfo> { const r = await this.http.request<any>("GET", `/repos/${repo}/releases/tags/${encodeURIComponent(tagName)}`); return { id: String(r.id), tagName: r.tag_name, name: r.name ?? "", description: r.body ?? "", createdAt: r.created_at, releasedAt: r.published_at ?? r.created_at, author: mapUser(r.author ?? {}, "gitee"), assets: [], rawData: r }; }
  async create(p: { repository: string; tagName: string; name?: string; description?: string }): Promise<ReleaseInfo> { const r = await this.http.request<any>("POST", `/repos/${p.repository}/releases`, { body: JSON.stringify({ tag_name: p.tagName, name: p.name, body: p.description }) }); return { id: String(r.id), tagName: r.tag_name, name: r.name ?? "", description: r.body ?? "", createdAt: r.created_at, releasedAt: r.published_at ?? r.created_at, author: mapUser(r.author ?? {}, "gitee"), assets: [], rawData: r }; }
  async update(repo: string, tagName: string, p: { name?: string; description?: string }): Promise<ReleaseInfo> { const r0 = await this.http.request<any>("GET", `/repos/${repo}/releases/tags/${encodeURIComponent(tagName)}`); const r = await this.http.request<any>("PATCH", `/repos/${repo}/releases/${r0.id}`, { body: JSON.stringify(p) }); return { id: String(r.id), tagName: r.tag_name, name: r.name ?? "", description: r.body ?? "", createdAt: r.created_at, releasedAt: r.published_at ?? r.created_at, author: mapUser(r.author ?? {}, "gitee"), assets: [], rawData: r }; }
  async delete(repo: string, tagName: string): Promise<void> { const r = await this.http.request<any>("GET", `/repos/${repo}/releases/tags/${encodeURIComponent(tagName)}`); await this.http.request("DELETE", `/repos/${repo}/releases/${r.id}`); }
}

export class GiteeReleaseProvider implements ToolProvider {
  constructor(private readonly c: GiteeReleaseCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_releases", description: "List releases", inputSchema: z.object({ repository: z.string() }), execute: async (i) => JSON.stringify(await this.c.list((i as any).repository)) },
    { action: "get_release", description: "Get a release", inputSchema: z.object({ repository: z.string(), tagName: z.string() }), execute: async (i) => JSON.stringify(await this.c.get((i as any).repository, (i as any).tagName)) },
    { action: "create_release", description: "Create a release", inputSchema: z.object({ repository: z.string(), tagName: z.string(), name: z.string().optional(), description: z.string().optional() }), execute: async (i) => JSON.stringify(await this.c.create(i as any)) },
    { action: "update_release", description: "Update a release", inputSchema: z.object({ repository: z.string(), tagName: z.string(), name: z.string().optional(), description: z.string().optional() }), execute: async (i) => JSON.stringify(await this.c.update((i as any).repository, (i as any).tagName, i as any)) },
    { action: "delete_release", description: "Delete a release", inputSchema: z.object({ repository: z.string(), tagName: z.string() }), execute: async (i) => { await this.c.delete((i as any).repository, (i as any).tagName); return "{}"; } },
  ]; }
}

// ── Commits ──
export class GiteeCommitCollection implements ICommitCollection {
  constructor(private readonly http: GiteeHttpClient) {}
  async list(p: { repository: string; ref?: string; page?: number; perPage?: number }): Promise<PaginatedList<CommitInfo>> {
    let q = `?per_page=${p.perPage ?? 20}&page=${p.page ?? 1}`; if (p.ref) q += `&sha=${p.ref}`;
    const data = await this.http.request<any[]>("GET", `/repos/${p.repository}/commits${q}`);
    return makeList(data.map(c => ({ sha: c.sha, message: (c.commit as any)?.message ?? "", author: mapUser(c.author ?? (c.commit as any)?.author ?? {}, "gitee"), authoredDate: (c.commit as any)?.author?.date ?? "", committedDate: (c.commit as any)?.committer?.date ?? "", parentShas: ((c.parents as any[]) ?? []).map(x => x.sha), webUrl: c.html_url ?? "" })));
  }
  async get(repo: string, sha: string): Promise<CommitInfo> { const c = await this.http.request<any>("GET", `/repos/${repo}/commits/${sha}`); return { sha: c.sha, message: (c.commit as any)?.message ?? "", author: mapUser(c.author ?? {}, "gitee"), authoredDate: (c.commit as any)?.author?.date ?? "", committedDate: (c.commit as any)?.committer?.date ?? "", parentShas: ((c.parents as any[]) ?? []).map(x => x.sha), webUrl: c.html_url ?? "" }; }
  async getDiff(repo: string, sha: string): Promise<any[]> { const c = await this.http.request<any>("GET", `/repos/${repo}/commits/${sha}`); return ((c.files as any[]) ?? []).map((f: any) => ({ oldPath: f.filename, newPath: f.filename, diff: f.patch ?? "", newFile: f.status === "added", deletedFile: f.status === "removed", renamedFile: f.status === "renamed" })); }
  async getFileBlame(): Promise<any[]> { return []; }
  async listStatuses(repo: string, sha: string): Promise<any[]> { const data = await this.http.request<any>("GET", `/repos/${repo}/commits/${sha}/status`); return ((data.statuses as any[]) ?? []).map((s: any) => ({ sha, state: s.state, context: s.context, description: s.description ?? "", targetUrl: s.target_url })); }
  async createStatus(p: { repository: string; sha: string; state: string; context?: string; description?: string }): Promise<any> { const s = await this.http.request<any>("POST", `/repos/${p.repository}/statuses/${p.sha}`, { body: JSON.stringify(p) }); return { sha: p.sha, state: s.state, context: s.context, description: s.description ?? "", targetUrl: s.target_url }; }
}

export class GiteeCommitProvider implements ToolProvider {
  constructor(private readonly c: GiteeCommitCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_commits", description: "List commits", inputSchema: z.object({ repository: z.string(), ref: z.string().optional(), page: z.number().optional(), perPage: z.number().optional() }), execute: async (i) => JSON.stringify(await this.c.list(i as any)) },
    { action: "get_commit", description: "Get a commit", inputSchema: z.object({ repository: z.string(), sha: z.string() }), execute: async (i) => JSON.stringify(await this.c.get((i as any).repository, (i as any).sha)) },
    { action: "get_commit_diff", description: "Get commit diff", inputSchema: z.object({ repository: z.string(), sha: z.string() }), execute: async (i) => JSON.stringify(await this.c.getDiff((i as any).repository, (i as any).sha)) },
    { action: "list_commit_statuses", description: "List commit statuses", inputSchema: z.object({ repository: z.string(), sha: z.string() }), execute: async (i) => JSON.stringify(await this.c.listStatuses((i as any).repository, (i as any).sha)) },
    { action: "create_commit_status", description: "Create commit status", inputSchema: z.object({ repository: z.string(), sha: z.string(), state: z.enum(["pending","running","success","failed","canceled"]), context: z.string().optional(), description: z.string().optional(), targetUrl: z.string().optional() }), execute: async (i) => JSON.stringify(await this.c.createStatus(i as any)) },
  ]; }
}

// ── Search ──
export class GiteeSearchCollection implements ISearchCollection {
  constructor(private readonly http: GiteeHttpClient) {}
  async searchCode(p: { repository?: string; search: string; page?: number; perPage?: number }): Promise<PaginatedList<CodeSearchResult>> {
    let q = p.search; if (p.repository) q += `+repo:${p.repository}`;
    const data = await this.http.request<any>("GET", `/search/repositories?q=${encodeURIComponent(q)}&per_page=${p.perPage ?? 20}&page=${p.page ?? 1}`);
    return makeList(((data.items as any[]) ?? []).map((i: any) => ({ path: i.full_name, basename: i.name, data: i.description ?? "", startline: 1, ref: i.default_branch ?? "", projectId: String(i.id) })));
  }
}

export class GiteeSearchProvider implements ToolProvider {
  constructor(private readonly c: GiteeSearchCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "search_code", description: "Search code", inputSchema: z.object({ search: z.string(), repository: z.string().optional(), page: z.number().optional(), perPage: z.number().optional() }), execute: async (i) => JSON.stringify(await this.c.searchCode(i as any)) },
  ]; }
}

// ── Pipeline (stub) ──
export class GiteePipelineCollection implements IPipelineCollection {
  private e() { throw new Error("Gitee does not support pipelines via REST API."); }
  async list(): Promise<any> { this.e(); return [] as any; }
  async get(): Promise<any> { this.e(); }
  async getJobs(): Promise<any[]> { this.e(); return []; }
  async getJobOutput(): Promise<string> { this.e(); return ""; }
  async create(): Promise<any> { this.e(); }
  async retry(): Promise<any> { this.e(); }
  async cancel(): Promise<any> { this.e(); }
  async playJob(): Promise<any> { this.e(); }
  async retryJob(): Promise<any> { this.e(); }
  async cancelJob(): Promise<any> { this.e(); }
  async listJobArtifacts(): Promise<any[]> { this.e(); return []; }
  async listMrPipelines(): Promise<any[]> { this.e(); return []; }
}
