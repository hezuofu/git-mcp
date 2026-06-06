import type { IReleaseCollection, ICommitCollection, ISearchCollection, ToolProvider, ToolDescriptor, PaginatedList, ReleaseInfo, CommitInfo, CommitDiff, CommitStatus, CodeSearchResult, User } from "@git-mcp/core";
import { z } from "zod";
import type { GitHubHttpClient } from "./github-http-client.js";

function makeList<T>(items: T[]): PaginatedList<T> {
  return { items, totalCount: items.length, pageInfo: { currentPage: 1, perPage: 100 }, nextPage: async () => null, hasMore: () => false, [Symbol.asyncIterator]() { return items[Symbol.iterator]() as any; } } as any;
}
function mapUser(u: any, p: string): User {
  return { id: String(u.id), username: u.login, name: u.login, email: null, avatarUrl: u.avatar_url, platform: p as any };
}

// ── Releases ──
export class GitHubReleaseCollection implements IReleaseCollection {
  constructor(private readonly http: GitHubHttpClient) {}
  async list(repo: string): Promise<PaginatedList<ReleaseInfo>> {
    const data = await this.http.request<any[]>("GET", `/repos/${repo}/releases?per_page=100`);
    return makeList(data.map(r => ({ id: String(r.id), tagName: r.tag_name as string, name: (r.name as string) ?? "", description: (r.body as string) ?? "", createdAt: r.created_at as string, releasedAt: r.published_at as string ?? r.created_at as string, author: mapUser(r.author, "github"), assets: ((r.assets as any[]) ?? []).map(a => ({ id: String(a.id), name: a.name, size: a.size, downloadUrl: a.browser_download_url, contentType: a.content_type })), rawData: r })));
  }
  async get(repo: string, tagName: string): Promise<ReleaseInfo> {
    const r = await this.http.request<any>("GET", `/repos/${repo}/releases/tags/${encodeURIComponent(tagName)}`);
    return { id: String(r.id), tagName: r.tag_name, name: r.name ?? "", description: r.body ?? "", createdAt: r.created_at, releasedAt: r.published_at ?? r.created_at, author: mapUser(r.author, "github"), assets: ((r.assets as any[]) ?? []).map(a => ({ id: String(a.id), name: a.name, size: a.size, downloadUrl: a.browser_download_url, contentType: a.content_type })), rawData: r };
  }
  async create(params: { repository: string; tagName: string; name?: string; description?: string }): Promise<ReleaseInfo> {
    const r = await this.http.request<any>("POST", `/repos/${params.repository}/releases`, { body: JSON.stringify({ tag_name: params.tagName, name: params.name, body: params.description }) });
    return { id: String(r.id), tagName: r.tag_name, name: r.name ?? "", description: r.body ?? "", createdAt: r.created_at, releasedAt: r.published_at ?? r.created_at, author: mapUser(r.author, "github"), assets: [], rawData: r };
  }
  async update(repo: string, tagName: string, params: { name?: string; description?: string }): Promise<ReleaseInfo> {
    const release = await this.http.request<any>("GET", `/repos/${repo}/releases/tags/${encodeURIComponent(tagName)}`);
    const r = await this.http.request<any>("PATCH", `/repos/${repo}/releases/${release.id}`, { body: JSON.stringify(params) });
    return { id: String(r.id), tagName: r.tag_name, name: r.name ?? "", description: r.body ?? "", createdAt: r.created_at, releasedAt: r.published_at ?? r.created_at, author: mapUser(r.author, "github"), assets: [], rawData: r };
  }
  async delete(repo: string, tagName: string): Promise<void> {
    const r = await this.http.request<any>("GET", `/repos/${repo}/releases/tags/${encodeURIComponent(tagName)}`);
    await this.http.request("DELETE", `/repos/${repo}/releases/${r.id}`);
  }
}

export class GitHubReleaseProvider implements ToolProvider {
  constructor(private readonly c: GitHubReleaseCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_releases", description: "List releases", inputSchema: z.object({ repository: z.string() }), execute: async (i) => JSON.stringify(await this.c.list((i as any).repository)) },
    { action: "get_release", description: "Get a release", inputSchema: z.object({ repository: z.string(), tagName: z.string() }), execute: async (i) => JSON.stringify(await this.c.get((i as any).repository, (i as any).tagName)) },
    { action: "create_release", description: "Create a release", inputSchema: z.object({ repository: z.string(), tagName: z.string(), name: z.string().optional(), description: z.string().optional() }), execute: async (i) => JSON.stringify(await this.c.create(i as any)) },
    { action: "update_release", description: "Update a release", inputSchema: z.object({ repository: z.string(), tagName: z.string(), name: z.string().optional(), description: z.string().optional() }), execute: async (i) => JSON.stringify(await this.c.update((i as any).repository, (i as any).tagName, i as any)) },
    { action: "delete_release", description: "Delete a release", inputSchema: z.object({ repository: z.string(), tagName: z.string() }), execute: async (i) => { await this.c.delete((i as any).repository, (i as any).tagName); return "{}"; } },
  ]; }
}

// ── Commits ──
export class GitHubCommitCollection implements ICommitCollection {
  constructor(private readonly http: GitHubHttpClient) {}
  async list(params: { repository: string; ref?: string; path?: string; since?: string; until?: string; page?: number; perPage?: number }): Promise<PaginatedList<CommitInfo>> {
    let qs = `?per_page=${params.perPage ?? 20}&page=${params.page ?? 1}`;
    if (params.ref) qs += `&sha=${params.ref}`;
    if (params.path) qs += `&path=${params.path}`;
    if (params.since) qs += `&since=${params.since}`;
    if (params.until) qs += `&until=${params.until}`;
    const data = await this.http.request<any[]>("GET", `/repos/${params.repository}/commits${qs}`);
    return makeList(data.map(c => ({ sha: c.sha, message: (c.commit as any).message, author: mapUser((c.commit as any).author, "github"), authoredDate: (c.commit as any).author.date, committedDate: (c.commit as any).committer.date, parentShas: ((c.parents as any[]) ?? []).map(p => p.sha), webUrl: c.html_url })));
  }
  async get(repo: string, sha: string): Promise<CommitInfo> {
    const c = await this.http.request<any>("GET", `/repos/${repo}/commits/${sha}`);
    return { sha: c.sha, message: (c.commit as any).message, author: mapUser(c.author ?? (c.commit as any).author, "github"), authoredDate: (c.commit as any).author.date, committedDate: (c.commit as any).committer.date, parentShas: ((c.parents as any[]) ?? []).map(p => p.sha), webUrl: c.html_url };
  }
  async getDiff(repo: string, sha: string): Promise<CommitDiff[]> {
    const c = await this.http.request<any>("GET", `/repos/${repo}/commits/${sha}`);
    return ((c.files as any[]) ?? []).map((f: any) => ({ oldPath: f.filename, newPath: f.filename, diff: f.patch ?? "", newFile: f.status === "added", deletedFile: f.status === "removed", renamedFile: f.status === "renamed" }));
  }
  async getFileBlame(repo: string, path: string, ref?: string): Promise<any[]> {
    const qs = ref ? `?ref=${ref}` : "";
    const data = await this.http.request<any[]>("GET", `/repos/${repo}/git/blame/${path}${qs}`);
    return (data ?? []).map((b: any) => ({ startLine: b.start_line ?? 1, endLine: b.end_line ?? 1, commit: { sha: b.commit?.sha, message: b.commit?.message ?? "", author: b.commit?.author ? mapUser(b.commit.author, "github") : { id: "", username: "", name: "", email: null, avatarUrl: "", platform: "github" }, authoredDate: b.commit?.author?.date ?? "" } }));
  }
  async listStatuses(repo: string, sha: string): Promise<CommitStatus[]> {
    const data = await this.http.request<any>("GET", `/repos/${repo}/commits/${sha}/status`);
    return ((data.statuses as any[]) ?? []).map((s: any) => ({ sha, state: s.state, context: s.context, description: s.description ?? "", targetUrl: s.target_url }));
  }
  async createStatus(params: { repository: string; sha: string; state: string; context?: string; description?: string; targetUrl?: string }): Promise<CommitStatus> {
    const s = await this.http.request<any>("POST", `/repos/${params.repository}/statuses/${params.sha}`, { body: JSON.stringify({ state: params.state, context: params.context ?? "git-mcp", description: params.description, target_url: params.targetUrl }) });
    return { sha: params.sha, state: s.state, context: s.context, description: s.description ?? "", targetUrl: s.target_url };
  }
}

export class GitHubCommitProvider implements ToolProvider {
  constructor(private readonly c: GitHubCommitCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_commits", description: "List commits", inputSchema: z.object({ repository: z.string(), ref: z.string().optional(), path: z.string().optional(), since: z.string().optional(), until: z.string().optional(), page: z.number().optional(), perPage: z.number().optional() }), execute: async (i) => JSON.stringify(await this.c.list(i as any)) },
    { action: "get_commit", description: "Get a commit", inputSchema: z.object({ repository: z.string(), sha: z.string() }), execute: async (i) => JSON.stringify(await this.c.get((i as any).repository, (i as any).sha)) },
    { action: "get_commit_diff", description: "Get commit diff", inputSchema: z.object({ repository: z.string(), sha: z.string() }), execute: async (i) => JSON.stringify(await this.c.getDiff((i as any).repository, (i as any).sha)) },
    { action: "get_file_blame", description: "Get file blame", inputSchema: z.object({ repository: z.string(), path: z.string(), ref: z.string().optional() }), execute: async (i) => JSON.stringify(await this.c.getFileBlame((i as any).repository, (i as any).path, (i as any).ref)) },
    { action: "list_commit_statuses", description: "List commit statuses", inputSchema: z.object({ repository: z.string(), sha: z.string() }), execute: async (i) => JSON.stringify(await this.c.listStatuses((i as any).repository, (i as any).sha)) },
    { action: "create_commit_status", description: "Create commit status", inputSchema: z.object({ repository: z.string(), sha: z.string(), state: z.enum(["pending","running","success","failed","canceled"]), context: z.string().optional(), description: z.string().optional(), targetUrl: z.string().optional() }), execute: async (i) => JSON.stringify(await this.c.createStatus(i as any)) },
  ]; }
}

// ── Search ──
export class GitHubSearchCollection implements ISearchCollection {
  constructor(private readonly http: GitHubHttpClient) {}
  async searchCode(params: { repository?: string; group?: string; search: string; page?: number; perPage?: number }): Promise<PaginatedList<CodeSearchResult>> {
    let q = params.search;
    if (params.repository) q += `+repo:${params.repository}`;
    if (params.group) q += `+org:${params.group}`;
    const data = await this.http.request<any>("GET", `/search/code?q=${encodeURIComponent(q)}&per_page=${params.perPage ?? 20}&page=${params.page ?? 1}`);
    return makeList(((data.items as any[]) ?? []).map((i: any) => ({ path: i.path, basename: i.name, data: "", startline: 1, ref: i.repository?.default_branch ?? "", projectId: String(i.repository?.id ?? "") })));
  }
}

export class GitHubSearchProvider implements ToolProvider {
  constructor(private readonly c: GitHubSearchCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "search_code", description: "Search code", inputSchema: z.object({ search: z.string(), repository: z.string().optional(), group: z.string().optional(), page: z.number().optional(), perPage: z.number().optional() }), execute: async (i) => JSON.stringify(await this.c.searchCode(i as any)) },
  ]; }
}
