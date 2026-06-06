import { GitPlatform, ConnectionPool } from "@git-mcp/core";
import type {
  PlatformId, User, AuthenticatedSession,
  IRepositoryCollection, IPrMrCollection, IIssueCollection,
  IFileCollection, IBranchCollection,
  ILabelCollection, ITagCollection, IReleaseCollection,
  ICommitCollection, ISearchCollection, IPipelineCollection,
  IIssueLinkCollection, ITodoCollection, IDraftNoteCollection,
  IReactionCollection, IMrVersionCollection,
  PaginatedList, Repository, SearchReposParams, GetRepoParams,
  CreateRepoParams, ForkRepoParams, BranchInfo,
  PullRequest, PrFilter, GetPrParams, CreatePrParams,
  Issue, IssueFilter, GetIssueParams, CreateIssueParams,
  ToolProvider, ToolDescriptor,
} from "@git-mcp/core";
import { z } from "zod";
import { GitLabSession } from "./gitlab-session.js";
import { GitLabHttpClient } from "./gitlab-http-client.js";
import { GitLabRepository, GitLabBranch } from "./models/gitlab-repository.js";
import { GitLabMergeRequest } from "./models/gitlab-merge-request.js";
import { GitLabIssue } from "./models/gitlab-issue.js";
import { GitLabLabelCollection, GitLabLabelProvider } from "./gitlab-labels.js";
import { GitLabTagCollection, GitLabTagProvider } from "./gitlab-tags.js";
import { GitLabReleaseCollection, GitLabReleaseProvider, GitLabCommitCollection, GitLabCommitProvider, GitLabSearchCollection, GitLabSearchProvider } from "./gitlab-extra.js";
import { GitLabPipelineCollection, GitLabPipelineProvider } from "./gitlab-pipeline.js";
import { GitLabIssueLinkCollection, GitLabIssueLinkProvider, GitLabTodoCollection, GitLabTodoProvider, GitLabReactionCollection, GitLabReactionProvider, GitLabDraftNoteCollection, GitLabDraftNoteProvider, GitLabMrVersionCollection, GitLabMrVersionProvider } from "./gitlab-issues-complete.js";

export class GitLabPlatform extends GitPlatform {
  readonly id: PlatformId = "gitlab";
  readonly displayName = "GitLab";
  readonly defaultApiUrl = "https://gitlab.com/api/v4";
  readonly terminology = { pr: "merge request" };

  private _http: GitLabHttpClient | null = null;
  private _pool: ConnectionPool = new ConnectionPool({});

  get httpClient(): GitLabHttpClient {
    if (!this._http) throw new Error("GitLabPlatform not initialized. Call registerSession first.");
    return this._http;
  }

  registerSession(session: AuthenticatedSession, apiUrl?: string): void {
    this._http = new GitLabHttpClient(apiUrl ?? this.defaultApiUrl, session, this._pool);
  }

  createSession(token: string, apiUrl?: string): AuthenticatedSession {
    const session = new GitLabSession(token);
    this.registerSession(session, apiUrl);
    return session;
  }

  createHttpClient(session: AuthenticatedSession, pool: ConnectionPool, apiUrl?: string): GitLabHttpClient {
    return new GitLabHttpClient(apiUrl ?? this.defaultApiUrl, session, pool);
  }

  protected async _resolveUser(session: AuthenticatedSession): Promise<User> {
    const data = await this.httpClient.request<Record<string, unknown>>("GET", "/user");
    return {
      id: String(data.id), username: data.username as string, name: data.name as string,
      email: (data.email as string) ?? null, avatarUrl: data.avatar_url as string, platform: "gitlab",
    };
  }

  buildApiError(statusCode: number, body: unknown): Error {
    const { GitLabApiError } = require("./gitlab-api-error.js");
    return new GitLabApiError(statusCode, body);
  }

  getToolProviders(): ToolProvider[] {
    return [
      new GitLabRepoProvider(this), new GitLabPrProvider(this),
      new GitLabIssueProvider(this), new GitLabFileProvider(this),
      new GitLabBranchProvider(this),
      new GitLabLabelProvider(new GitLabLabelCollection(this.httpClient)),
      new GitLabTagProvider(new GitLabTagCollection(this.httpClient)),
      new GitLabReleaseProvider(new GitLabReleaseCollection(this.httpClient)),
      new GitLabCommitProvider(new GitLabCommitCollection(this.httpClient)),
      new GitLabSearchProvider(new GitLabSearchCollection(this.httpClient)),
      new GitLabPipelineProvider(new GitLabPipelineCollection(this.httpClient)),
      new GitLabIssueLinkProvider(new GitLabIssueLinkCollection(this.httpClient)),
      new GitLabTodoProvider(new GitLabTodoCollection(this.httpClient)),
      new GitLabReactionProvider(new GitLabReactionCollection(this.httpClient)),
      new GitLabDraftNoteProvider(new GitLabDraftNoteCollection(this.httpClient)),
      new GitLabMrVersionProvider(new GitLabMrVersionCollection(this.httpClient)),
    ];
  }

  get repositories(): IRepositoryCollection { return new GitLabRepoCollection(this); }
  get pullRequests(): IPrMrCollection { return new GitLabPrCollection(this); }
  get issues(): IIssueCollection { return new GitLabIssueCollection(this); }
  get files(): IFileCollection { return new GitLabFileCollection(this); }
  get branches(): IBranchCollection { return new GitLabBranchCollection(this); }
  get labels(): ILabelCollection { return new GitLabLabelCollection(this.httpClient); }
  get tags(): ITagCollection { return new GitLabTagCollection(this.httpClient); }
  get releases(): IReleaseCollection { return new GitLabReleaseCollection(this.httpClient); }
  get commits(): ICommitCollection { return new GitLabCommitCollection(this.httpClient); }
  get search(): ISearchCollection { return new GitLabSearchCollection(this.httpClient); }
  get pipelines(): IPipelineCollection { return new GitLabPipelineCollection(this.httpClient); }
  get issueLinks(): IIssueLinkCollection { return new GitLabIssueLinkCollection(this.httpClient); }
  get todos(): ITodoCollection { return new GitLabTodoCollection(this.httpClient); }
  get draftNotes(): IDraftNoteCollection { return new GitLabDraftNoteCollection(this.httpClient); }
  get reactions(): IReactionCollection { return new GitLabReactionCollection(this.httpClient); }
  get mrVersions(): IMrVersionCollection { return new GitLabMrVersionCollection(this.httpClient); }
}

function makeList<T>(items: T[], total: number | null, page: number, perPage: number): PaginatedList<T> {
  return { items, totalCount: total, pageInfo: { currentPage: page, perPage }, nextPage: async () => null, hasMore: () => false, [Symbol.asyncIterator]() { return items[Symbol.iterator]() as any; } } as unknown as PaginatedList<T>;
}
function makeSimpleList<T>(items: T[]): PaginatedList<T> { return makeList(items, items.length, 1, 100); }

// ── Repo ──
class GitLabRepoCollection implements IRepositoryCollection {
  constructor(private readonly p: GitLabPlatform) {}
  async search(c: SearchReposParams): Promise<PaginatedList<Repository>> {
    const q = c.search ? `?search=${encodeURIComponent(c.search)}&per_page=${c.perPage ?? 20}&page=${c.page ?? 1}` : `?per_page=${c.perPage ?? 20}&page=${c.page ?? 1}`;
    const data = await this.p.httpClient.request<Record<string, unknown>[]>("GET", `/projects${q}`);
    return makeSimpleList(data.map(r => GitLabRepository.fromApi(r)));
  }
  async get(params: GetRepoParams): Promise<Repository> {
    const raw = await this.p.httpClient.request<Record<string, unknown>>("GET", `/projects/${encodeURIComponent(params.path)}`);
    return GitLabRepository.fromApi(raw);
  }
  async create(params: CreateRepoParams): Promise<Repository> {
    const raw = await this.p.httpClient.request<Record<string, unknown>>("POST", "/projects", { body: JSON.stringify({ name: params.name, description: params.description, visibility: params.visibility ?? "private" }) });
    return GitLabRepository.fromApi(raw);
  }
  async fork(params: ForkRepoParams): Promise<Repository> {
    const body: any = {};
    if (params.targetNamespace) body.namespace_path = params.targetNamespace;
    const raw = await this.p.httpClient.request<Record<string, unknown>>("POST", `/projects/${encodeURIComponent(params.path)}/fork`, { body: JSON.stringify(body) });
    return GitLabRepository.fromApi(raw);
  }
  async listBranches(repoPath: string): Promise<PaginatedList<BranchInfo>> {
    const data = await this.p.httpClient.request<Record<string, unknown>[]>("GET", `/projects/${encodeURIComponent(repoPath)}/repository/branches?per_page=100`);
    return makeSimpleList(data.map(r => GitLabBranch.fromApi(r)));
  }
}

class GitLabRepoProvider implements ToolProvider {
  constructor(private readonly p: GitLabPlatform) {}
  getTools(): ToolDescriptor[] { return [
    { action: "search_repos", description: "Search GitLab projects", inputSchema: z.object({ search: z.string().optional(), page: z.number().optional(), perPage: z.number().optional() }), execute: async (input) => JSON.stringify(await this.p.repositories.search(input as any)) },
    { action: "get_repo", description: "Get a GitLab project by path", inputSchema: z.object({ path: z.string() }), execute: async (input) => JSON.stringify(await this.p.repositories.get(input as any)) },
    { action: "create_repo", description: "Create a GitLab project", inputSchema: z.object({ name: z.string(), description: z.string().optional(), visibility: z.enum(["private","public","internal"]).optional() }), execute: async (input) => JSON.stringify(await this.p.repositories.create(input as any)) },
    { action: "fork_repo", description: "Fork a GitLab project", inputSchema: z.object({ path: z.string(), targetNamespace: z.string().optional() }), execute: async (input) => JSON.stringify(await this.p.repositories.fork(input as any)) },
  ];}
}

// ── MR ──
class GitLabPrCollection implements IPrMrCollection {
  constructor(private readonly p: GitLabPlatform) {}
  async list(filter: PrFilter): Promise<PaginatedList<PullRequest>> {
    let path: string;
    if (filter.repository) { path = `/projects/${encodeURIComponent(filter.repository)}/merge_requests?state=${filter.state ?? "opened"}&per_page=${filter.perPage ?? 20}&page=${filter.page ?? 1}`; }
    else { path = `/merge_requests?scope=all&per_page=${filter.perPage ?? 20}&page=${filter.page ?? 1}`; }
    const data = await this.p.httpClient.request<Record<string, unknown>[]>("GET", path);
    return makeSimpleList(data.map((r: any) => new GitLabMergeRequest(r, this.p.httpClient)));
  }
  async get(params: GetPrParams): Promise<PullRequest> {
    const raw = await this.p.httpClient.request<Record<string, unknown>>("GET", `/projects/${encodeURIComponent(params.repository)}/merge_requests/${params.iid}`);
    return new GitLabMergeRequest(raw, this.p.httpClient);
  }
  async create(params: CreatePrParams, repository: string): Promise<PullRequest> {
    const raw = await this.p.httpClient.request<Record<string, unknown>>("POST", `/projects/${encodeURIComponent(repository)}/merge_requests`, {
      body: JSON.stringify({ title: params.title, source_branch: params.sourceBranch, target_branch: params.targetBranch, description: params.description }),
    });
    return new GitLabMergeRequest(raw, this.p.httpClient);
  }
}

class GitLabPrProvider implements ToolProvider {
  constructor(private readonly p: GitLabPlatform) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_prs", description: "List {term:pr} with filtering", inputSchema: z.object({ repository: z.string().optional(), state: z.enum(["open","closed","merged"]).optional(), page: z.number().optional(), perPage: z.number().optional() }), execute: async (input) => JSON.stringify(await this.p.pullRequests.list(input as any)) },
    { action: "get_pr", description: "Get a {term:pr} by IID", inputSchema: z.object({ repository: z.string(), iid: z.number() }), execute: async (input) => JSON.stringify(await this.p.pullRequests.get(input as any)) },
    { action: "create_pr", description: "Create a {term:pr}", inputSchema: z.object({ repository: z.string(), title: z.string(), sourceBranch: z.string(), targetBranch: z.string(), description: z.string().optional() }), execute: async (input) => JSON.stringify(await this.p.pullRequests.create(input as any, (input as any).repository)) },
    { action: "get_pr_diffs", description: "Get file changes of a {term:pr}", inputSchema: z.object({ repository: z.string(), iid: z.number() }), execute: async (input) => { const mr = await this.p.pullRequests.get(input as any); return JSON.stringify(await mr.diffs()); } },
    { action: "merge_pr", description: "Merge a {term:pr}", inputSchema: z.object({ repository: z.string(), iid: z.number(), method: z.enum(["merge","squash"]).optional() }), execute: async (input) => { const mr = await this.p.pullRequests.get(input as any); return JSON.stringify(await mr.merge({ method: (input as any).method })); } },
    { action: "list_pr_notes", description: "List notes on a {term:pr}", inputSchema: z.object({ repository: z.string(), iid: z.number() }), execute: async (input) => { const mr = await this.p.pullRequests.get(input as any); const notes: any[] = []; for await (const n of await mr.notes()) notes.push(n); return JSON.stringify(notes); } },
  ];}
}

// ── Issue ──
class GitLabIssueCollection implements IIssueCollection {
  constructor(private readonly p: GitLabPlatform) {}
  async list(filter: IssueFilter): Promise<PaginatedList<Issue>> {
    let path: string;
    if (filter.repository) { path = `/projects/${encodeURIComponent(filter.repository)}/issues?state=${filter.state ?? "opened"}&per_page=${filter.perPage ?? 20}&page=${filter.page ?? 1}`; }
    else { path = `/issues?scope=all&per_page=${filter.perPage ?? 20}&page=${filter.page ?? 1}`; }
    const data = await this.p.httpClient.request<Record<string, unknown>[]>("GET", path);
    return makeSimpleList(data.map((r: any) => new GitLabIssue(r, this.p.httpClient)));
  }
  async get(params: GetIssueParams): Promise<Issue> {
    const raw = await this.p.httpClient.request<Record<string, unknown>>("GET", `/projects/${encodeURIComponent(params.repository)}/issues/${params.iid}`);
    return new GitLabIssue(raw, this.p.httpClient);
  }
  async create(params: CreateIssueParams, repository: string): Promise<Issue> {
    const raw = await this.p.httpClient.request<Record<string, unknown>>("POST", `/projects/${encodeURIComponent(repository)}/issues`, {
      body: JSON.stringify({ title: params.title, description: params.description, labels: params.labels?.join(",") }),
    });
    return new GitLabIssue(raw, this.p.httpClient);
  }
}

class GitLabIssueProvider implements ToolProvider {
  constructor(private readonly p: GitLabPlatform) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_issues", description: "List issues", inputSchema: z.object({ repository: z.string().optional(), state: z.enum(["open","closed"]).optional(), page: z.number().optional(), perPage: z.number().optional() }), execute: async (input) => JSON.stringify(await this.p.issues.list(input as any)) },
    { action: "get_issue", description: "Get an issue", inputSchema: z.object({ repository: z.string(), iid: z.number() }), execute: async (input) => JSON.stringify(await this.p.issues.get(input as any)) },
    { action: "create_issue", description: "Create an issue", inputSchema: z.object({ repository: z.string(), title: z.string(), description: z.string().optional(), labels: z.array(z.string()).optional() }), execute: async (input) => JSON.stringify(await this.p.issues.create(input as any, (input as any).repository)) },
    { action: "list_issue_notes", description: "List notes", inputSchema: z.object({ repository: z.string(), iid: z.number() }), execute: async (input) => { const issue = await this.p.issues.get(input as any); const notes: any[] = []; for await (const n of await issue.notes()) notes.push(n); return JSON.stringify(notes); } },
    { action: "create_issue_note", description: "Add note", inputSchema: z.object({ repository: z.string(), iid: z.number(), body: z.string() }), execute: async (input) => { const issue = await this.p.issues.get(input as any); return JSON.stringify(await issue.createNote((input as any).body)); } },
  ];}
}

// ── File ──
class GitLabFileCollection implements IFileCollection {
  constructor(private readonly p: GitLabPlatform) {}
  async getContents(repository: string, path: string, ref?: string): Promise<{ path: string; content: string; encoding: string; size: number; sha: string }> {
    const qs = ref ? `?ref=${ref}` : "";
    const raw = await this.p.httpClient.request<Record<string, unknown>>("GET", `/projects/${encodeURIComponent(repository)}/repository/files/${encodeURIComponent(path)}${qs}`);
    const content = raw.content ? Buffer.from(raw.content as string, "base64").toString("utf-8") : "";
    return { path: raw.file_path as string, content, encoding: raw.encoding as string ?? "utf-8", size: raw.size as number, sha: raw.blob_id as string };
  }
  async createOrUpdate(repository: string, params: { path: string; content: string; branch: string; commitMessage: string }): Promise<{ filePath: string; branch: string; commitSha: string }> {
    const raw = await this.p.httpClient.request<Record<string, unknown>>("POST", `/projects/${encodeURIComponent(repository)}/repository/files/${encodeURIComponent(params.path)}`, {
      body: JSON.stringify({ branch: params.branch, content: params.content, commit_message: params.commitMessage, encoding: "text" }),
    });
    return { filePath: params.path, branch: params.branch, commitSha: raw.last_commit_id as string ?? "" };
  }
  async pushFiles(repository: string, branch: string, files: { path: string; content: string }[], message: string): Promise<{ sha: string; branch: string; message: string }> {
    const actions = files.map(f => ({ action: "create" as const, file_path: f.path, content: f.content }));
    const raw = await this.p.httpClient.request<Record<string, unknown>>("POST", `/projects/${encodeURIComponent(repository)}/repository/commits`, {
      body: JSON.stringify({ branch, commit_message: message, actions }),
    });
    return { sha: raw.id as string, branch, message };
  }
}

class GitLabFileProvider implements ToolProvider {
  constructor(private readonly p: GitLabPlatform) {}
  getTools(): ToolDescriptor[] { return [
    { action: "get_file_contents", description: "Get file contents", inputSchema: z.object({ repository: z.string(), path: z.string(), ref: z.string().optional() }), execute: async (input) => JSON.stringify(await this.p.files.getContents((input as any).repository, (input as any).path, (input as any).ref)) },
    { action: "create_or_update_file", description: "Create or update file", inputSchema: z.object({ repository: z.string(), path: z.string(), content: z.string(), branch: z.string(), commitMessage: z.string() }), execute: async (input) => JSON.stringify(await this.p.files.createOrUpdate((input as any).repository, input as any)) },
  ];}
}

// ── Branch ──
class GitLabBranchCollection implements IBranchCollection {
  constructor(private readonly p: GitLabPlatform) {}
  async list(repository: string): Promise<PaginatedList<BranchInfo>> { return this.p.repositories.listBranches(repository); }
  async get(repository: string, name: string): Promise<BranchInfo> {
    const raw = await this.p.httpClient.request<Record<string, unknown>>("GET", `/projects/${encodeURIComponent(repository)}/repository/branches/${encodeURIComponent(name)}`);
    return GitLabBranch.fromApi(raw);
  }
  async create(params: { repository: string; name: string; ref: string }): Promise<BranchInfo> {
    const raw = await this.p.httpClient.request<Record<string, unknown>>("POST", `/projects/${encodeURIComponent(params.repository)}/repository/branches`, {
      body: JSON.stringify({ branch: params.name, ref: params.ref }),
    });
    return GitLabBranch.fromApi(raw);
  }
  async delete(params: { repository: string; name: string }): Promise<void> {
    await this.p.httpClient.request("DELETE", `/projects/${encodeURIComponent(params.repository)}/repository/branches/${encodeURIComponent(params.name)}`);
  }
}

class GitLabBranchProvider implements ToolProvider {
  constructor(private readonly p: GitLabPlatform) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_branches", description: "List branches", inputSchema: z.object({ repository: z.string(), search: z.string().optional() }), execute: async (input) => JSON.stringify(await this.p.branches.list((input as any).repository)) },
    { action: "get_branch", description: "Get branch", inputSchema: z.object({ repository: z.string(), name: z.string() }), execute: async (input) => JSON.stringify(await this.p.branches.get((input as any).repository, (input as any).name)) },
    { action: "create_branch", description: "Create branch", inputSchema: z.object({ repository: z.string(), name: z.string(), ref: z.string() }), execute: async (input) => JSON.stringify(await this.p.branches.create(input as any)) },
  ];}
}
