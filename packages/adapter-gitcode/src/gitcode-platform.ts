import { GitPlatform, ConnectionPool, UnsupportedOperationError } from "@git-mcp/core";
import type { PlatformId, User, AuthenticatedSession, IRepositoryCollection, IPrMrCollection, IIssueCollection, IFileCollection, IBranchCollection, ILabelCollection, ITagCollection, IReleaseCollection, ICommitCollection, ISearchCollection, IPipelineCollection, IIssueLinkCollection, ITodoCollection, IDraftNoteCollection, IReactionCollection, IMrVersionCollection, PaginatedList, Repository, SearchReposParams, GetRepoParams, CreateRepoParams, ForkRepoParams, BranchInfo, PullRequest, PrFilter, GetPrParams, CreatePrParams, Issue, IssueFilter, GetIssueParams, CreateIssueParams, Label, TagInfo, ReleaseInfo, CommitInfo, CommitDiff, CommitStatus, CodeSearchResult, ToolProvider, ToolDescriptor } from "@git-mcp/core";
import { z } from "zod";
import { GitCodeSession } from "./gitcode-session.js";
import { GitCodeHttpClient } from "./gitcode-http-client.js";
import { GitCodeRepository, GitCodeBranch } from "./models/gitcode-repository.js";
import { GitCodePullRequest } from "./models/gitcode-pull-request.js";
import { GitCodeIssue } from "./models/gitcode-issue.js";

const PL = "gitcode" as const;

function makeList<T>(items: T[]): PaginatedList<T> {
  return { items, totalCount: items.length, pageInfo: { currentPage: 1, perPage: 100 }, nextPage: async () => null, hasMore: () => false, [Symbol.asyncIterator]() { return items[Symbol.iterator]() as any; } } as any;
}

export class GitCodePlatform extends GitPlatform {
  readonly id: PlatformId = "gitcode";
  readonly displayName = "GitCode";
  readonly defaultApiUrl = "https://api.gitcode.com/api/v5";
  readonly terminology = { pr: "pull request" };

  private _http: GitCodeHttpClient | null = null;
  private _pool: ConnectionPool = new ConnectionPool({});

  get http(): GitCodeHttpClient { if (!this._http) throw new Error("Not initialized"); return this._http; }

  registerSession(session: AuthenticatedSession, apiUrl?: string): void { this._http = new GitCodeHttpClient(apiUrl ?? this.defaultApiUrl, session, this._pool); }
  createSession(token: string, apiUrl?: string): AuthenticatedSession { const s = new GitCodeSession(token); this.registerSession(s, apiUrl); return s; }
  createHttpClient(s: AuthenticatedSession, p: ConnectionPool, u?: string) { return new GitCodeHttpClient(u ?? this.defaultApiUrl, s, p); }
  protected async _resolveUser(): Promise<User> { const d = await this.http.request<any>("GET", "/user"); return { id: String(d.id), username: d.login as string, name: (d.name as string) ?? (d.login as string), email: d.email ?? null, avatarUrl: d.avatar_url as string ?? "", platform: "gitcode" }; }
  buildApiError(s: number, b: unknown) { const { GitCodeApiError } = require("./gitcode-api-error.js"); return new GitCodeApiError(s, b); }

  getToolProviders(): ToolProvider[] {
    return [
      new RepoProvider(this.repositories as RepoCollection),
      new PrProvider(this.pullRequests as PrCollection),
      new IssueProvider(this.issues as IssueCollection),
      new FileProvider(this.files as FileCollection),
      new BranchProvider(this.branches as BranchCollection),
      new LabelProvider(this.labels as LabelCollection),
      new TagProvider(this.tags as TagCollection),
      new ReleaseProvider(this.releases as ReleaseCollection),
      new CommitProvider(this.commits as CommitCollection),
      new SearchProvider(this.search as SearchCollection),
    ];
  }

  get repositories() { return new RepoCollection(this.http); }
  get pullRequests() { return new PrCollection(this.http); }
  get issues() { return new IssueCollection(this.http); }
  get files() { return new FileCollection(this.http); }
  get branches() { return new BranchCollection(this.http); }
  get labels() { return new LabelCollection(this.http); }
  get tags() { return new TagCollection(this.http); }
  get releases() { return new ReleaseCollection(this.http); }
  get commits() { return new CommitCollection(this.http); }
  get search() { return new SearchCollection(this.http); }
  get pipelines(): IPipelineCollection { return stub(PL, "pipelines"); }
  get issueLinks(): IIssueLinkCollection { return stub(PL, "issue_links"); }
  get todos(): ITodoCollection { return stub(PL, "todos"); }
  get draftNotes(): IDraftNoteCollection { return stub(PL, "draft_notes"); }
  get reactions(): IReactionCollection { return stub(PL, "emoji_reactions"); }
  get mrVersions(): IMrVersionCollection { return stub(PL, "mr_versions"); }
}

function stub(platform: string, feature: string): any {
  const e = () => { throw new UnsupportedOperationError(feature, platform); };
  const el = async () => ({ items: [] as any[], totalCount: 0, pageInfo: { currentPage: 1, perPage: 20 }, nextPage: async () => null as any, hasMore: () => false, [Symbol.asyncIterator]() { return [][Symbol.iterator](); } });
  return { list: el, get: e, create: e, update: e, delete: e, merge: e, close: e, reopen: e, notes: el, markDone: e, markAllDone: e, publish: e, publishAll: e, listMrReactions: el, createMrReaction: e, deleteMrReaction: e, listMrNoteReactions: el, createMrNoteReaction: e, deleteMrNoteReaction: e, listIssueReactions: el, createIssueReaction: e, deleteIssueReaction: e, listIssueNoteReactions: el, createIssueNoteReaction: e, deleteIssueNoteReaction: e, getJobs: e, getJobOutput: e, retry: e, cancel: e, playJob: e, retryJob: e, cancelJob: e, listJobArtifacts: e, listMrPipelines: e, searchCode: e };
}

// ═══ Collections (all take GitCodeHttpClient) ═══

class RepoCollection implements IRepositoryCollection {
  constructor(private readonly h: GitCodeHttpClient) {}
  async search(c: SearchReposParams): Promise<PaginatedList<Repository>> {
    const q = c.search ? `?q=${encodeURIComponent(c.search)}&per_page=${c.perPage ?? 20}&page=${c.page ?? 1}` : `?per_page=${c.perPage ?? 20}&page=${c.page ?? 1}`;
    const data = await this.h.request<any>("GET", `/search/repositories${q}`);
    return makeList((Array.isArray(data) ? data : (data.items ?? [])).map((r: any) => GitCodeRepository.fromApi(r)));
  }
  async get(p: GetRepoParams): Promise<Repository> { const r = await this.h.request<any>("GET", `/repos/${p.path}`); return GitCodeRepository.fromApi(r); }
  async create(p: CreateRepoParams): Promise<Repository> { const r = await this.h.request<any>("POST", "/user/repos", { body: JSON.stringify({ name: p.name, description: p.description, private: p.visibility === "private" }) }); return GitCodeRepository.fromApi(r); }
  async fork(p: ForkRepoParams): Promise<Repository> { const r = await this.h.request<any>("POST", `/repos/${p.path}/forks`, { body: JSON.stringify(p.targetNamespace ? { organization: p.targetNamespace } : {}) }); return GitCodeRepository.fromApi(r); }
  async listBranches(repo: string): Promise<PaginatedList<BranchInfo>> { const data = await this.h.request<any[]>("GET", `/repos/${repo}/branches?per_page=100`); return makeList(data.map(r => GitCodeBranch.fromApi(r))); }
}

class RepoProvider implements ToolProvider {
  constructor(private readonly c: RepoCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "search_repos", description: "Search repositories", inputSchema: z.object({ search: z.string().optional(), page: z.number().optional(), perPage: z.number().optional() }), execute: async (i: any) => JSON.stringify(await this.c.search(i)) },
    { action: "get_repo", description: "Get a repository", inputSchema: z.object({ path: z.string() }), execute: async (i: any) => JSON.stringify(await this.c.get(i)) },
    { action: "create_repo", description: "Create a repository", inputSchema: z.object({ name: z.string(), description: z.string().optional(), visibility: z.enum(["private","public"]).optional() }), execute: async (i: any) => JSON.stringify(await this.c.create(i)) },
    { action: "fork_repo", description: "Fork a repository", inputSchema: z.object({ path: z.string(), targetNamespace: z.string().optional() }), execute: async (i: any) => JSON.stringify(await this.c.fork(i)) },
  ];}
}

// PR
class PrCollection implements IPrMrCollection {
  constructor(private readonly h: GitCodeHttpClient) {}
  async list(f: PrFilter): Promise<PaginatedList<PullRequest>> {
    const path = f.repository ? `/repos/${f.repository}/pulls?state=${f.state ?? "open"}&per_page=${f.perPage ?? 20}&page=${f.page ?? 1}` : `/user/pulls?per_page=${f.perPage ?? 20}&page=${f.page ?? 1}`;
    const data = await this.h.request<any[]>("GET", path);
    return makeList((Array.isArray(data) ? data : []).map((r: any) => new GitCodePullRequest(r, this.h)));
  }
  async get(p: GetPrParams): Promise<PullRequest> { const r = await this.h.request<any>("GET", `/repos/${p.repository}/pulls/${p.iid}`); return new GitCodePullRequest(r, this.h); }
  async create(p: CreatePrParams, repo: string): Promise<PullRequest> { const r = await this.h.request<any>("POST", `/repos/${repo}/pulls`, { body: JSON.stringify({ title: p.title, head: p.sourceBranch, base: p.targetBranch, body: p.description }) }); return new GitCodePullRequest(r, this.h); }
}

class PrProvider implements ToolProvider {
  constructor(private readonly c: PrCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_prs", description: "List {term:pr}", inputSchema: z.object({ repository: z.string().optional(), state: z.enum(["open","closed","merged"]).optional(), page: z.number().optional(), perPage: z.number().optional() }), execute: async (i: any) => JSON.stringify(await this.c.list(i)) },
    { action: "get_pr", description: "Get a {term:pr}", inputSchema: z.object({ repository: z.string(), iid: z.number() }), execute: async (i: any) => JSON.stringify(await this.c.get(i)) },
    { action: "create_pr", description: "Create a {term:pr}", inputSchema: z.object({ repository: z.string(), title: z.string(), sourceBranch: z.string(), targetBranch: z.string(), description: z.string().optional() }), execute: async (i: any) => JSON.stringify(await this.c.create(i, i.repository)) },
    { action: "get_pr_diffs", description: "Get file changes", inputSchema: z.object({ repository: z.string(), iid: z.number() }), execute: async (i: any) => { const pr = await this.c.get(i); return JSON.stringify(await pr.diffs()); } },
    { action: "merge_pr", description: "Merge", inputSchema: z.object({ repository: z.string(), iid: z.number(), method: z.enum(["merge","squash"]).optional() }), execute: async (i: any) => { const pr = await this.c.get(i); return JSON.stringify(await pr.merge({ method: i.method })); } },
    { action: "list_pr_notes", description: "List notes", inputSchema: z.object({ repository: z.string(), iid: z.number() }), execute: async (i: any) => { const pr = await this.c.get(i); const notes: any[] = []; for await (const n of await pr.notes()) notes.push(n); return JSON.stringify(notes); } },
  ];}
}

// Issue
class IssueCollection implements IIssueCollection {
  constructor(private readonly h: GitCodeHttpClient) {}
  async list(f: IssueFilter): Promise<PaginatedList<Issue>> {
    const path = f.repository ? `/repos/${f.repository}/issues?state=${f.state ?? "open"}&per_page=${f.perPage ?? 20}&page=${f.page ?? 1}` : `/user/issues?per_page=${f.perPage ?? 20}&page=${f.page ?? 1}`;
    const data = await this.h.request<any[]>("GET", path);
    return makeList((Array.isArray(data) ? data : []).map((r: any) => new GitCodeIssue(r, this.h)));
  }
  async get(p: GetIssueParams): Promise<Issue> { const r = await this.h.request<any>("GET", `/repos/${p.repository}/issues/${p.iid}`); return new GitCodeIssue(r, this.h); }
  async create(p: CreateIssueParams, repo: string): Promise<Issue> { const r = await this.h.request<any>("POST", `/repos/${repo}/issues`, { body: JSON.stringify({ title: p.title, body: p.description, labels: p.labels?.join(",") }) }); return new GitCodeIssue(r, this.h); }
}

class IssueProvider implements ToolProvider {
  constructor(private readonly c: IssueCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_issues", description: "List issues", inputSchema: z.object({ repository: z.string().optional(), state: z.enum(["open","closed"]).optional(), page: z.number().optional(), perPage: z.number().optional() }), execute: async (i: any) => JSON.stringify(await this.c.list(i)) },
    { action: "get_issue", description: "Get an issue", inputSchema: z.object({ repository: z.string(), iid: z.number() }), execute: async (i: any) => JSON.stringify(await this.c.get(i)) },
    { action: "create_issue", description: "Create an issue", inputSchema: z.object({ repository: z.string(), title: z.string(), description: z.string().optional(), labels: z.array(z.string()).optional() }), execute: async (i: any) => JSON.stringify(await this.c.create(i, i.repository)) },
    { action: "list_issue_notes", description: "List notes", inputSchema: z.object({ repository: z.string(), iid: z.number() }), execute: async (i: any) => { const issue = await this.c.get(i); const notes: any[] = []; for await (const n of await issue.notes()) notes.push(n); return JSON.stringify(notes); } },
    { action: "create_issue_note", description: "Add note", inputSchema: z.object({ repository: z.string(), iid: z.number(), body: z.string() }), execute: async (i: any) => { const issue = await this.c.get(i); return JSON.stringify(await issue.createNote(i.body)); } },
  ];}
}

// File
class FileCollection implements IFileCollection {
  constructor(private readonly h: GitCodeHttpClient) {}
  async getContents(repo: string, path: string, ref?: string): Promise<{ path: string; content: string; encoding: string; size: number; sha: string }> {
    const raw = await this.h.request<any>("GET", `/repos/${repo}/contents/${path}${ref ? `?ref=${ref}` : ""}`);
    const content = raw.content ? Buffer.from(raw.content as string, "base64").toString("utf-8") : "";
    return { path: (raw.path as string) ?? path, content, encoding: raw.encoding as string ?? "utf-8", size: raw.size as number ?? 0, sha: raw.sha as string ?? "" };
  }
  async createOrUpdate(repo: string, p: { path: string; content: string; branch: string; commitMessage: string }): Promise<{ filePath: string; branch: string; commitSha: string }> {
    const raw = await this.h.request<any>("POST", `/repos/${repo}/contents/${p.path}`, { body: JSON.stringify({ content: Buffer.from(p.content).toString("base64"), message: p.commitMessage, branch: p.branch }) });
    return { filePath: p.path, branch: p.branch, commitSha: (raw.commit as any)?.sha ?? "" };
  }
  async pushFiles(repo: string, branch: string, files: { path: string; content: string }[], message: string): Promise<{ sha: string; branch: string; message: string }> {
    const raw = await this.h.request<any>("POST", `/repos/${repo}/commits`, { body: JSON.stringify({ branch, commit_message: message, actions: files.map(f => ({ action: "create" as const, file_path: f.path, content: f.content })) }) });
    return { sha: (raw.id as string) ?? "", branch, message };
  }
}

class FileProvider implements ToolProvider {
  constructor(private readonly c: FileCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "get_file_contents", description: "Get file contents", inputSchema: z.object({ repository: z.string(), path: z.string(), ref: z.string().optional() }), execute: async (i: any) => JSON.stringify(await this.c.getContents(i.repository, i.path, i.ref)) },
    { action: "create_or_update_file", description: "Create or update file", inputSchema: z.object({ repository: z.string(), path: z.string(), content: z.string(), branch: z.string(), commitMessage: z.string() }), execute: async (i: any) => JSON.stringify(await this.c.createOrUpdate(i.repository, i)) },
  ];}
}

// Branch
class BranchCollection implements IBranchCollection {
  constructor(private readonly h: GitCodeHttpClient) {}
  async list(repo: string): Promise<PaginatedList<BranchInfo>> { const data = await this.h.request<any[]>("GET", `/repos/${repo}/branches?per_page=100`); return makeList(data.map(r => GitCodeBranch.fromApi(r))); }
  async get(repo: string, name: string): Promise<BranchInfo> { const r = await this.h.request<any>("GET", `/repos/${repo}/branches/${encodeURIComponent(name)}`); return GitCodeBranch.fromApi(r); }
  async create(p: { repository: string; name: string; ref: string }): Promise<BranchInfo> {
    const r = await this.h.request<any>("POST", `/repos/${p.repository}/branches`, { body: JSON.stringify({ branch_name: p.name, ref: p.ref }) });
    return GitCodeBranch.fromApi(r);
  }
  async delete(): Promise<void> { throw new UnsupportedOperationError("branch_deletion", PL); }
}

class BranchProvider implements ToolProvider {
  constructor(private readonly c: BranchCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_branches", description: "List branches", inputSchema: z.object({ repository: z.string() }), execute: async (i: any) => JSON.stringify(await this.c.list(i.repository)) },
    { action: "get_branch", description: "Get branch", inputSchema: z.object({ repository: z.string(), name: z.string() }), execute: async (i: any) => JSON.stringify(await this.c.get(i.repository, i.name)) },
    { action: "create_branch", description: "Create branch", inputSchema: z.object({ repository: z.string(), name: z.string(), ref: z.string() }), execute: async (i: any) => JSON.stringify(await this.c.create(i)) },
  ];}
}

// Label
class LabelCollection implements ILabelCollection {
  constructor(private readonly h: GitCodeHttpClient) {}
  async list(repo: string): Promise<PaginatedList<Label>> { const d = await this.h.request<any[]>("GET", `/repos/${repo}/labels?per_page=100`); return makeList(d.map((l: any) => ({ id: String(l.id), name: l.name, color: l.color, description: l.description ?? null }))); }
  async get(repo: string, name: string): Promise<Label> { const l = await this.h.request<any>("GET", `/repos/${repo}/labels/${encodeURIComponent(name)}`); return { id: String(l.id), name: l.name, color: l.color, description: l.description ?? null }; }
  async create(repo: string, p: { name: string; color: string; description?: string }): Promise<Label> { const l = await this.h.request<any>("POST", `/repos/${repo}/labels`, { body: JSON.stringify(p) }); return { id: String(l.id), name: l.name, color: l.color, description: l.description ?? null }; }
  async update(repo: string, name: string, p: { newName?: string; color?: string; description?: string }): Promise<Label> { const l = await this.h.request<any>("PATCH", `/repos/${repo}/labels/${encodeURIComponent(name)}`, { body: JSON.stringify(p) }); return { id: String(l.id), name: l.name, color: l.color, description: l.description ?? null }; }
  async delete(repo: string, name: string): Promise<void> { await this.h.request("DELETE", `/repos/${repo}/labels/${encodeURIComponent(name)}`); }
}

class LabelProvider implements ToolProvider {
  constructor(private readonly c: LabelCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_labels", description: "List labels", inputSchema: z.object({ repository: z.string() }), execute: async (i: any) => JSON.stringify(await this.c.list(i.repository)) },
    { action: "get_label", description: "Get label", inputSchema: z.object({ repository: z.string(), name: z.string() }), execute: async (i: any) => JSON.stringify(await this.c.get(i.repository, i.name)) },
    { action: "create_label", description: "Create label", inputSchema: z.object({ repository: z.string(), name: z.string(), color: z.string(), description: z.string().optional() }), execute: async (i: any) => JSON.stringify(await this.c.create(i.repository, i)) },
    { action: "update_label", description: "Update label", inputSchema: z.object({ repository: z.string(), name: z.string(), newName: z.string().optional(), color: z.string().optional(), description: z.string().optional() }), execute: async (i: any) => JSON.stringify(await this.c.update(i.repository, i.name, i)) },
    { action: "delete_label", description: "Delete label", inputSchema: z.object({ repository: z.string(), name: z.string() }), execute: async (i: any) => { await this.c.delete(i.repository, i.name); return "{}"; } },
  ];}
}

// Tags
class TagCollection implements ITagCollection {
  constructor(private readonly h: GitCodeHttpClient) {}
  async list(repo: string): Promise<PaginatedList<TagInfo>> {
    try { const d = await this.h.request<any[]>("GET", `/repos/${repo}/tags?per_page=100`); return makeList(d.map((t: any) => ({ name: t.name, message: t.message ?? "", commitSha: (t.commit as any)?.sha ?? "", createdAt: "" }))); }
    catch { return makeList([]); }
  }
  async get(repo: string, name: string): Promise<TagInfo> { const d = await this.h.request<any[]>("GET", `/repos/${repo}/tags?per_page=100`); const t = d.find((x: any) => x.name === name); if (!t) throw new Error(`Tag ${name} not found`); return { name: t.name, message: t.message ?? "", commitSha: (t.commit as any)?.sha ?? "", createdAt: "" }; }
  async create(p: { repository: string; name: string; ref: string; message?: string }): Promise<TagInfo> { const r = await this.h.request<any>("POST", `/repos/${p.repository}/tags`, { body: JSON.stringify({ tag_name: p.name, ref: p.ref, message: p.message }) }); return { name: r.name, message: r.message ?? "", commitSha: (r.commit as any)?.sha ?? "", createdAt: "" }; }
  async delete(): Promise<void> { throw new UnsupportedOperationError("tag_deletion", PL); }
}

class TagProvider implements ToolProvider {
  constructor(private readonly c: TagCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_tags", description: "List tags", inputSchema: z.object({ repository: z.string() }), execute: async (i: any) => JSON.stringify(await this.c.list(i.repository)) },
    { action: "get_tag", description: "Get tag", inputSchema: z.object({ repository: z.string(), name: z.string() }), execute: async (i: any) => JSON.stringify(await this.c.get(i.repository, i.name)) },
    { action: "create_tag", description: "Create tag", inputSchema: z.object({ repository: z.string(), name: z.string(), ref: z.string(), message: z.string().optional() }), execute: async (i: any) => JSON.stringify(await this.c.create(i)) },
  ];}
}

// Releases
class ReleaseCollection implements IReleaseCollection {
  constructor(private readonly h: GitCodeHttpClient) {}
  private m(r: any): ReleaseInfo { return { id: String(r.id), tagName: r.tag_name, name: r.name ?? "", description: r.body ?? "", createdAt: r.created_at, releasedAt: r.published_at ?? r.created_at, author: { id:"", username:"", name:"", email:null, avatarUrl:"", platform:"gitcode" as const }, assets: ((r.assets as any[])??[]).map((a: any) => ({ id: String(a.id??a.name), name: a.name, size: a.size??0, downloadUrl: a.browser_download_url??a.url??"", contentType: a.content_type??"" })), rawData: r }; }
  async list(repo: string): Promise<PaginatedList<ReleaseInfo>> { const d = await this.h.request<any[]>("GET", `/repos/${repo}/releases?per_page=100`); return makeList(d.map(r => this.m(r))); }
  async get(repo: string, tag: string): Promise<ReleaseInfo> { const r = await this.h.request<any>("GET", `/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`); return this.m(r); }
  async create(p: { repository: string; tagName: string; name?: string; description?: string }): Promise<ReleaseInfo> { const r = await this.h.request<any>("POST", `/repos/${p.repository}/releases`, { body: JSON.stringify({ tag_name: p.tagName, name: p.name, body: p.description }) }); return this.m(r); }
  async update(repo: string, tag: string, p: { name?: string; description?: string }): Promise<ReleaseInfo> { const r0 = await this.h.request<any>("GET", `/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`); const r = await this.h.request<any>("PATCH", `/repos/${repo}/releases/${r0.id}`, { body: JSON.stringify(p) }); return this.m(r); }
  async delete(repo: string, tag: string): Promise<void> { const r = await this.h.request<any>("GET", `/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`); await this.h.request("DELETE", `/repos/${repo}/releases/${r.id}`); }
}

class ReleaseProvider implements ToolProvider {
  constructor(private readonly c: ReleaseCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_releases", description: "List releases", inputSchema: z.object({ repository: z.string() }), execute: async (i: any) => JSON.stringify(await this.c.list(i.repository)) },
    { action: "get_release", description: "Get release", inputSchema: z.object({ repository: z.string(), tagName: z.string() }), execute: async (i: any) => JSON.stringify(await this.c.get(i.repository, i.tagName)) },
    { action: "create_release", description: "Create release", inputSchema: z.object({ repository: z.string(), tagName: z.string(), name: z.string().optional(), description: z.string().optional() }), execute: async (i: any) => JSON.stringify(await this.c.create(i)) },
    { action: "update_release", description: "Update release", inputSchema: z.object({ repository: z.string(), tagName: z.string(), name: z.string().optional(), description: z.string().optional() }), execute: async (i: any) => JSON.stringify(await this.c.update(i.repository, i.tagName, i)) },
    { action: "delete_release", description: "Delete release", inputSchema: z.object({ repository: z.string(), tagName: z.string() }), execute: async (i: any) => { await this.c.delete(i.repository, i.tagName); return "{}"; } },
  ];}
}

// Commits
class CommitCollection implements ICommitCollection {
  constructor(private readonly h: GitCodeHttpClient) {}
  async list(p: { repository: string; ref?: string; page?: number; perPage?: number }): Promise<PaginatedList<CommitInfo>> {
    let qs = `?per_page=${p.perPage ?? 20}&page=${p.page ?? 1}`; if (p.ref) qs += `&sha=${p.ref}`;
    const d = await this.h.request<any[]>("GET", `/repos/${p.repository}/commits${qs}`);
    return makeList(d.map((c: any) => ({ sha: c.sha, message: (c.commit as any)?.message ?? "", author: { id:"", username:"", name:"", email:null, avatarUrl:"", platform:"gitcode" as const }, authoredDate: (c.commit as any)?.author?.date ?? "", committedDate: (c.commit as any)?.committer?.date ?? "", parentShas: ((c.parents as any[])??[]).map((x: any) => x.sha), webUrl: c.html_url ?? "" })));
  }
  async get(repo: string, sha: string): Promise<CommitInfo> { const c = await this.h.request<any>("GET", `/repos/${repo}/commits/${sha}?show_diff=1`); return { sha: c.sha, message: (c.commit as any)?.message ?? "", author: { id:"", username:"", name:"", email:null, avatarUrl:"", platform:"gitcode" as const }, authoredDate: (c.commit as any)?.author?.date ?? "", committedDate: (c.commit as any)?.committer?.date ?? "", parentShas: ((c.parents as any[])??[]).map((x: any) => x.sha), webUrl: c.html_url ?? "" }; }
  async getDiff(repo: string, sha: string): Promise<CommitDiff[]> { const c = await this.h.request<any>("GET", `/repos/${repo}/commits/${sha}?show_diff=1`); return ((c.files as any[])??[]).map((f: any) => ({ oldPath: f.filename ?? f.old_path, newPath: f.filename ?? f.new_path, diff: f.patch ?? f.diff ?? "", newFile: f.status === "added", deletedFile: f.status === "removed", renamedFile: f.status === "renamed" })); }
  async getFileBlame(): Promise<any[]> { return []; }
  async listStatuses(): Promise<CommitStatus[]> { return []; }
  async createStatus(): Promise<CommitStatus> { throw new UnsupportedOperationError("commit_status", PL); return {} as any; }
}

class CommitProvider implements ToolProvider {
  constructor(private readonly c: CommitCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_commits", description: "List commits", inputSchema: z.object({ repository: z.string(), ref: z.string().optional(), page: z.number().optional(), perPage: z.number().optional() }), execute: async (i: any) => JSON.stringify(await this.c.list(i)) },
    { action: "get_commit", description: "Get commit", inputSchema: z.object({ repository: z.string(), sha: z.string() }), execute: async (i: any) => JSON.stringify(await this.c.get(i.repository, i.sha)) },
    { action: "get_commit_diff", description: "Get commit diff", inputSchema: z.object({ repository: z.string(), sha: z.string() }), execute: async (i: any) => JSON.stringify(await this.c.getDiff(i.repository, i.sha)) },
  ];}
}

// Search
class SearchCollection implements ISearchCollection {
  constructor(private readonly h: GitCodeHttpClient) {}
  async searchCode(p: { search: string; repository?: string; page?: number; perPage?: number }): Promise<PaginatedList<CodeSearchResult>> {
    let q = p.search; if (p.repository) q += `+repo:${p.repository}`;
    const d = await this.h.request<any>("GET", `/search/repositories?q=${encodeURIComponent(q)}&per_page=${p.perPage ?? 20}&page=${p.page ?? 1}`);
    return makeList(((d.items as any[])??[]).map((i: any) => ({ path: i.full_name, basename: i.name, data: i.description ?? "", startline: 1, ref: i.default_branch ?? "", projectId: String(i.id) })));
  }
}

class SearchProvider implements ToolProvider {
  constructor(private readonly c: SearchCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "search_code", description: "Search code/repos", inputSchema: z.object({ search: z.string(), repository: z.string().optional(), page: z.number().optional(), perPage: z.number().optional() }), execute: async (i: any) => JSON.stringify(await this.c.searchCode(i)) },
  ];}
}
