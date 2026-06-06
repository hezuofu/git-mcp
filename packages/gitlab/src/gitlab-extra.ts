import type {
  IReleaseCollection, ICommitCollection, ISearchCollection,
  ToolProvider, ToolDescriptor, PaginatedList,
  ReleaseInfo, CommitInfo, CommitDiff, CommitStatus, CodeSearchResult, User,
} from "@git-mcp/core";
import { z } from "zod";
import type { GitLabHttpClient } from "./gitlab-http-client.js";

function makeList<T>(items: T[]): PaginatedList<T> {
  return { items, totalCount: items.length, pageInfo: { currentPage: 1, perPage: 100 }, nextPage: async () => null, hasMore: () => false, [Symbol.asyncIterator]() { return items[Symbol.iterator]() as any; } } as any;
}
function mapUser(u: any, p: string): User {
  return { id: String(u.id), username: u.username, name: u.name, email: null, avatarUrl: u.avatar_url, platform: p as any };
}

// ── Releases ──
export class GitLabReleaseCollection implements IReleaseCollection {
  constructor(private readonly http: GitLabHttpClient) {}
  async list(repo: string): Promise<PaginatedList<ReleaseInfo>> {
    const data = await this.http.request<any[]>("GET", `/projects/${encodeURIComponent(repo)}/releases?per_page=100`);
    return makeList(data.map(r => ({ id: String(r.tag_name), tagName: r.tag_name as string, name: (r.name as string) ?? "", description: (r.description as string) ?? "", createdAt: r.created_at as string, releasedAt: r.released_at as string ?? r.created_at as string, author: r.author ? mapUser(r.author, "gitlab") : { id: "", username: "", name: "", email: null, avatarUrl: "", platform: "gitlab" as const }, assets: ((r.assets?.links as any[]) ?? []).map(a => ({ id: String(a.id ?? a.name), name: a.name, size: 0, downloadUrl: a.url ?? a.direct_asset_url, contentType: "" })), rawData: r })));
  }
  async get(repo: string, tagName: string): Promise<ReleaseInfo> {
    const r = await this.http.request<any>("GET", `/projects/${encodeURIComponent(repo)}/releases/${encodeURIComponent(tagName)}`);
    return { id: String(r.tag_name), tagName: r.tag_name, name: r.name ?? "", description: r.description ?? "", createdAt: r.created_at, releasedAt: r.released_at ?? r.created_at, author: r.author ? mapUser(r.author, "gitlab") : { id: "", username: "", name: "", email: null, avatarUrl: "", platform: "gitlab" }, assets: [], rawData: r };
  }
  async create(params: { repository: string; tagName: string; name?: string; description?: string; ref?: string }): Promise<ReleaseInfo> {
    const r = await this.http.request<any>("POST", `/projects/${encodeURIComponent(params.repository)}/releases`, {
      body: JSON.stringify({ tag_name: params.tagName, name: params.name, description: params.description, ref: params.ref ?? params.tagName }),
    });
    return { id: String(r.tag_name), tagName: r.tag_name, name: r.name ?? "", description: r.description ?? "", createdAt: r.created_at, releasedAt: r.released_at ?? r.created_at, author: r.author ? mapUser(r.author, "gitlab") : { id: "", username: "", name: "", email: null, avatarUrl: "", platform: "gitlab" }, assets: [], rawData: r };
  }
  async update(repo: string, tagName: string, params: { name?: string; description?: string }): Promise<ReleaseInfo> {
    const r = await this.http.request<any>("PUT", `/projects/${encodeURIComponent(repo)}/releases/${encodeURIComponent(tagName)}`, { body: JSON.stringify(params) });
    return { id: String(r.tag_name), tagName: r.tag_name, name: r.name ?? "", description: r.description ?? "", createdAt: r.created_at, releasedAt: r.released_at ?? r.created_at, author: r.author ? mapUser(r.author, "gitlab") : { id: "", username: "", name: "", email: null, avatarUrl: "", platform: "gitlab" }, assets: [], rawData: r };
  }
  async delete(repo: string, tagName: string): Promise<void> {
    await this.http.request("DELETE", `/projects/${encodeURIComponent(repo)}/releases/${encodeURIComponent(tagName)}`);
  }
}

export class GitLabReleaseProvider implements ToolProvider {
  constructor(private readonly c: GitLabReleaseCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_releases", description: "List releases", inputSchema: z.object({ repository: z.string() }), execute: async (i) => JSON.stringify(await this.c.list((i as any).repository)) },
    { action: "get_release", description: "Get a release", inputSchema: z.object({ repository: z.string(), tagName: z.string() }), execute: async (i) => JSON.stringify(await this.c.get((i as any).repository, (i as any).tagName)) },
    { action: "create_release", description: "Create a release", inputSchema: z.object({ repository: z.string(), tagName: z.string(), name: z.string().optional(), description: z.string().optional(), ref: z.string().optional() }), execute: async (i) => JSON.stringify(await this.c.create(i as any)) },
    { action: "update_release", description: "Update a release", inputSchema: z.object({ repository: z.string(), tagName: z.string(), name: z.string().optional(), description: z.string().optional() }), execute: async (i) => JSON.stringify(await this.c.update((i as any).repository, (i as any).tagName, i as any)) },
    { action: "delete_release", description: "Delete a release", inputSchema: z.object({ repository: z.string(), tagName: z.string() }), execute: async (i) => { await this.c.delete((i as any).repository, (i as any).tagName); return "{}"; } },
  ]; }
}

// ── Commits ──
export class GitLabCommitCollection implements ICommitCollection {
  constructor(private readonly http: GitLabHttpClient) {}
  async list(params: { repository: string; ref?: string; path?: string; since?: string; until?: string; page?: number; perPage?: number }): Promise<PaginatedList<CommitInfo>> {
    let qs = `?per_page=${params.perPage ?? 20}&page=${params.page ?? 1}`;
    if (params.ref) qs += `&ref_name=${params.ref}`;
    if (params.path) qs += `&path=${encodeURIComponent(params.path)}`;
    if (params.since) qs += `&since=${params.since}`;
    if (params.until) qs += `&until=${params.until}`;
    const data = await this.http.request<any[]>("GET", `/projects/${encodeURIComponent(params.repository)}/repository/commits${qs}`);
    return makeList(data.map(c => ({ sha: c.id as string, message: c.message as string ?? "", author: mapUser(c, "gitlab"), authoredDate: c.authored_date as string ?? "", committedDate: c.committed_date as string ?? "", parentShas: ((c.parent_ids as any[]) ?? []).map(p => String(p)), webUrl: c.web_url as string ?? "" })));
  }
  async get(repo: string, sha: string): Promise<CommitInfo> {
    const c = await this.http.request<any>("GET", `/projects/${encodeURIComponent(repo)}/repository/commits/${sha}`);
    return { sha: c.id, message: c.message ?? "", author: mapUser(c, "gitlab"), authoredDate: c.authored_date ?? "", committedDate: c.committed_date ?? "", parentShas: ((c.parent_ids as any[]) ?? []).map(p => String(p)), webUrl: c.web_url ?? "" };
  }
  async getDiff(repo: string, sha: string): Promise<CommitDiff[]> {
    const c = await this.http.request<any>("GET", `/projects/${encodeURIComponent(repo)}/repository/commits/${sha}/diff`);
    return (Array.isArray(c) ? c : []).map((f: any) => ({ oldPath: f.old_path, newPath: f.new_path, diff: f.diff ?? "", newFile: f.new_file === true, deletedFile: f.deleted_file === true, renamedFile: f.renamed_file === true }));
  }
  async getFileBlame(repo: string, path: string, ref?: string): Promise<any[]> {
    const qs = ref ? `?ref=${ref}` : "";
    const data = await this.http.request<any[]>("GET", `/projects/${encodeURIComponent(repo)}/repository/files/${encodeURIComponent(path)}/blame${qs}`);
    return (data ?? []).map((b: any) => ({
      startLine: (b.lines as any[])?.[0] ?? 1,
      endLine: (b.lines as any[])?.[(b.lines as any[])?.length - 1] ?? 1,
      commit: { sha: b.commit?.id, message: b.commit?.message ?? "", author: b.commit ? mapUser(b.commit, "gitlab") : { id: "", username: "", name: "", email: null, avatarUrl: "", platform: "gitlab" as const }, authoredDate: b.commit?.authored_date ?? "" },
    }));
  }
  async listStatuses(repo: string, sha: string): Promise<CommitStatus[]> {
    const data = await this.http.request<any>("GET", `/projects/${encodeURIComponent(repo)}/repository/commits/${sha}/statuses`);
    return (Array.isArray(data) ? data : []).map((s: any) => ({ sha, state: s.status, context: s.name, description: s.description ?? "", targetUrl: s.target_url }));
  }
  async createStatus(params: { repository: string; sha: string; state: string; context?: string; description?: string; targetUrl?: string }): Promise<CommitStatus> {
    const s = await this.http.request<any>("POST", `/projects/${encodeURIComponent(params.repository)}/statuses/${params.sha}`, {
      body: JSON.stringify({ state: params.state, name: params.context ?? "git-mcp", description: params.description, target_url: params.targetUrl }),
    });
    return { sha: params.sha, state: s.status, context: s.name, description: s.description ?? "", targetUrl: s.target_url };
  }
}

export class GitLabCommitProvider implements ToolProvider {
  constructor(private readonly c: GitLabCommitCollection) {}
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
export class GitLabSearchCollection implements ISearchCollection {
  constructor(private readonly http: GitLabHttpClient) {}
  async searchCode(params: { repository?: string; group?: string; search: string; page?: number; perPage?: number }): Promise<PaginatedList<CodeSearchResult>> {
    let scope = "blobs";
    let scopePath = "";
    if (params.repository) scopePath = `/projects/${encodeURIComponent(params.repository)}`;
    else if (params.group) scopePath = `/groups/${encodeURIComponent(params.group)}`;
    const path = `${scopePath}/search?scope=${scope}&search=${encodeURIComponent(params.search)}&per_page=${params.perPage ?? 20}&page=${params.page ?? 1}`;
    const data = await this.http.request<any[]>("GET", path);
    return makeList((data ?? []).map((i: any) => ({ path: i.filename ?? i.path, basename: i.filename ?? "", data: i.data ?? "", startline: i.startline ?? 1, ref: i.ref ?? "", projectId: String(i.project_id ?? "") })));
  }
}

export class GitLabSearchProvider implements ToolProvider {
  constructor(private readonly c: GitLabSearchCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "search_code", description: "Search code", inputSchema: z.object({ search: z.string(), repository: z.string().optional(), group: z.string().optional(), page: z.number().optional(), perPage: z.number().optional() }), execute: async (i) => JSON.stringify(await this.c.searchCode(i as any)) },
  ]; }
}
