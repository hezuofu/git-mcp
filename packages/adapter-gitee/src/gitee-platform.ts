import { GitPlatform, ConnectionPool } from "@git-mcp/core";
import type {
  PlatformId, User, AuthenticatedSession,
  IRepositoryCollection, IPrMrCollection, IIssueCollection,
  IFileCollection, IBranchCollection,
  ILabelCollection, ITagCollection, IReleaseCollection,
  ICommitCollection, ISearchCollection, IPipelineCollection,
  PaginatedList, Repository, SearchReposParams, GetRepoParams,
  CreateRepoParams, ForkRepoParams, BranchInfo,
  PullRequest, PrFilter, GetPrParams, CreatePrParams,
  Issue, IssueFilter, GetIssueParams, CreateIssueParams,
  ToolProvider, ToolDescriptor,
} from "@git-mcp/core";
import { z } from "zod";
import { GiteeSession } from "./gitee-session.js";
import { GiteeHttpClient } from "./gitee-http-client.js";
import { GiteeRepository, GiteeBranch } from "./models/gitee-repository.js";
import { GiteePullRequest } from "./models/gitee-pull-request.js";
import { GiteeIssue } from "./models/gitee-issue.js";
import { GiteeLabelCollection, GiteeLabelProvider } from "./gitee-labels.js";
import { GiteeTagCollection, GiteeTagProvider, GiteeReleaseCollection, GiteeReleaseProvider, GiteeCommitCollection, GiteeCommitProvider, GiteeSearchCollection, GiteeSearchProvider, GiteePipelineCollection } from "./gitee-extra.js";

export class GiteePlatform extends GitPlatform {
  readonly id: PlatformId = "gitee";
  readonly displayName = "Gitee";
  readonly defaultApiUrl = "https://gitee.com/api/v5";
  readonly terminology = { pr: "pull request" };

  private _http: GiteeHttpClient | null = null;
  private _pool: ConnectionPool = new ConnectionPool({});

  get httpClient(): GiteeHttpClient {
    if (!this._http) throw new Error("GiteePlatform not initialized.");
    return this._http;
  }

  registerSession(session: AuthenticatedSession, apiUrl?: string): void {
    this._http = new GiteeHttpClient(apiUrl ?? this.defaultApiUrl, session, this._pool);
  }

  createSession(token: string, apiUrl?: string): AuthenticatedSession {
    const session = new GiteeSession(token);
    this.registerSession(session, apiUrl);
    return session;
  }

  createHttpClient(session: AuthenticatedSession, pool: ConnectionPool, apiUrl?: string): GiteeHttpClient {
    return new GiteeHttpClient(apiUrl ?? this.defaultApiUrl, session, pool);
  }

  protected async _resolveUser(session: AuthenticatedSession): Promise<User> {
    const data = await this.httpClient.request<Record<string, unknown>>("GET", "/user");
    return { id: String(data.id), username: data.login as string, name: (data.name as string) ?? (data.login as string), email: (data.email as string) ?? null, avatarUrl: data.avatar_url as string, platform: "gitee" };
  }

  buildApiError(statusCode: number, body: unknown): Error {
    const { GiteeApiError } = require("./gitee-api-error.js");
    return new GiteeApiError(statusCode, body);
  }

  getToolProviders(): ToolProvider[] {
    return [
      new GiteeRepoProvider(this), new GiteePrProvider(this),
      new GiteeIssueProvider(this), new GiteeFileProvider(this),
      new GiteeBranchProvider(this),
      new GiteeLabelProvider(new GiteeLabelCollection(this.httpClient)),
      new GiteeTagProvider(new GiteeTagCollection(this.httpClient)),
      new GiteeReleaseProvider(new GiteeReleaseCollection(this.httpClient)),
      new GiteeCommitProvider(new GiteeCommitCollection(this.httpClient)),
      new GiteeSearchProvider(new GiteeSearchCollection(this.httpClient)),
    ];
  }

  get repositories(): IRepositoryCollection { return new GiteeRepoCollection(this); }
  get pullRequests(): IPrMrCollection { return new GiteePrCollection(this); }
  get issues(): IIssueCollection { return new GiteeIssueCollection(this); }
  get files(): IFileCollection { return new GiteeFileCollection(this); }
  get branches(): IBranchCollection { return new GiteeBranchCollection(this); }
  get labels(): ILabelCollection { return new GiteeLabelCollection(this.httpClient); }
  get tags(): ITagCollection { return new GiteeTagCollection(this.httpClient); }
  get releases(): IReleaseCollection { return new GiteeReleaseCollection(this.httpClient); }
  get commits(): ICommitCollection { return new GiteeCommitCollection(this.httpClient); }
  get search(): ISearchCollection { return new GiteeSearchCollection(this.httpClient); }
  get pipelines(): IPipelineCollection { return new GiteePipelineCollection(); }
}

function makeList<T>(items: T[]): PaginatedList<T> {
  return { items, totalCount: items.length, pageInfo: { currentPage: 1, perPage: 100 }, nextPage: async () => null, hasMore: () => false, [Symbol.asyncIterator]() { return items[Symbol.iterator]() as any; } } as unknown as PaginatedList<T>;
}

// ── Repo ──
class GiteeRepoCollection implements IRepositoryCollection {
  constructor(private readonly p: GiteePlatform) {}
  async search(c: SearchReposParams): Promise<PaginatedList<Repository>> {
    const q = c.search ? `?q=${encodeURIComponent(c.search)}&per_page=${c.perPage ?? 20}&page=${c.page ?? 1}` : `?per_page=${c.perPage ?? 20}&page=${c.page ?? 1}`;
    const data = await this.p.httpClient.request<{ items?: Record<string, unknown>[] } | Record<string, unknown>[]>("GET", `/search/repositories${q}`);
    const arr = Array.isArray(data) ? data : (data as any).items ?? [];
    return makeList(arr.map((r: any) => GiteeRepository.fromApi(r)));
  }
  async get(params: GetRepoParams): Promise<Repository> {
    const raw = await this.p.httpClient.request<Record<string, unknown>>("GET", `/repos/${params.path}`);
    return GiteeRepository.fromApi(raw);
  }
  async create(params: CreateRepoParams): Promise<Repository> {
    const raw = await this.p.httpClient.request<Record<string, unknown>>("POST", "/user/repos", {
      body: JSON.stringify({ name: params.name, description: params.description, private: params.visibility === "private" }),
    });
    return GiteeRepository.fromApi(raw);
  }
  async fork(params: ForkRepoParams): Promise<Repository> {
    const raw = await this.p.httpClient.request<Record<string, unknown>>("POST", `/repos/${params.path}/forks`);
    return GiteeRepository.fromApi(raw);
  }
  async listBranches(repoPath: string): Promise<PaginatedList<BranchInfo>> {
    const data = await this.p.httpClient.request<Record<string, unknown>[]>("GET", `/repos/${repoPath}/branches?per_page=100`);
    return makeList(data.map(r => GiteeBranch.fromApi(r)));
  }
}

class GiteeRepoProvider implements ToolProvider {
  constructor(private readonly p: GiteePlatform) {}
  getTools(): ToolDescriptor[] { return [
    { action: "search_repos", description: "Search Gitee repositories", inputSchema: z.object({ search: z.string().optional(), page: z.number().optional(), perPage: z.number().optional() }), execute: async (input) => JSON.stringify(await this.p.repositories.search(input as any)) },
    { action: "get_repo", description: "Get a Gitee repository", inputSchema: z.object({ path: z.string() }), execute: async (input) => JSON.stringify(await this.p.repositories.get(input as any)) },
    { action: "create_repo", description: "Create a Gitee repository", inputSchema: z.object({ name: z.string(), description: z.string().optional(), visibility: z.enum(["private","public"]).optional() }), execute: async (input) => JSON.stringify(await this.p.repositories.create(input as any)) },
    { action: "fork_repo", description: "Fork a Gitee repository", inputSchema: z.object({ path: z.string() }), execute: async (input) => JSON.stringify(await this.p.repositories.fork(input as any)) },
  ];}
}

// ── PR ──
class GiteePrCollection implements IPrMrCollection {
  constructor(private readonly p: GiteePlatform) {}
  async list(filter: PrFilter): Promise<PaginatedList<PullRequest>> {
    let path: string;
    if (filter.repository) { path = `/repos/${filter.repository}/pulls?state=${filter.state ?? "open"}&per_page=${filter.perPage ?? 20}&page=${filter.page ?? 1}`; }
    else { path = `/user/pulls?per_page=${filter.perPage ?? 20}&page=${filter.page ?? 1}`; }
    const data = await this.p.httpClient.request<Record<string, unknown>[]>("GET", path);
    return makeList((Array.isArray(data) ? data : []).map((r: any) => new GiteePullRequest(r, this.p.httpClient)));
  }
  async get(params: GetPrParams): Promise<PullRequest> {
    const raw = await this.p.httpClient.request<Record<string, unknown>>("GET", `/repos/${params.repository}/pulls/${params.iid}`);
    return new GiteePullRequest(raw, this.p.httpClient);
  }
  async create(params: CreatePrParams, repository: string): Promise<PullRequest> {
    const raw = await this.p.httpClient.request<Record<string, unknown>>("POST", `/repos/${repository}/pulls`, {
      body: JSON.stringify({ title: params.title, head: params.sourceBranch, base: params.targetBranch, body: params.description }),
    });
    return new GiteePullRequest(raw, this.p.httpClient);
  }
}

class GiteePrProvider implements ToolProvider {
  constructor(private readonly p: GiteePlatform) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_prs", description: "List {term:pr}", inputSchema: z.object({ repository: z.string().optional(), state: z.enum(["open","closed","merged"]).optional(), page: z.number().optional(), perPage: z.number().optional() }), execute: async (input) => JSON.stringify(await this.p.pullRequests.list(input as any)) },
    { action: "get_pr", description: "Get a {term:pr}", inputSchema: z.object({ repository: z.string(), iid: z.number() }), execute: async (input) => JSON.stringify(await this.p.pullRequests.get(input as any)) },
    { action: "create_pr", description: "Create a {term:pr}", inputSchema: z.object({ repository: z.string(), title: z.string(), sourceBranch: z.string(), targetBranch: z.string(), description: z.string().optional() }), execute: async (input) => JSON.stringify(await this.p.pullRequests.create(input as any, (input as any).repository)) },
    { action: "get_pr_diffs", description: "Get file changes", inputSchema: z.object({ repository: z.string(), iid: z.number() }), execute: async (input) => { const pr = await this.p.pullRequests.get(input as any); return JSON.stringify(await pr.diffs()); } },
    { action: "merge_pr", description: "Merge", inputSchema: z.object({ repository: z.string(), iid: z.number(), method: z.enum(["merge","squash"]).optional() }), execute: async (input) => { const pr = await this.p.pullRequests.get(input as any); return JSON.stringify(await pr.merge({ method: (input as any).method })); } },
    { action: "list_pr_notes", description: "List notes", inputSchema: z.object({ repository: z.string(), iid: z.number() }), execute: async (input) => { const pr = await this.p.pullRequests.get(input as any); const notes: any[] = []; for await (const n of await pr.notes()) notes.push(n); return JSON.stringify(notes); } },
  ];}
}

// ── Issue ──
class GiteeIssueCollection implements IIssueCollection {
  constructor(private readonly p: GiteePlatform) {}
  async list(filter: IssueFilter): Promise<PaginatedList<Issue>> {
    let path: string;
    if (filter.repository) { path = `/repos/${filter.repository}/issues?state=${filter.state ?? "open"}&per_page=${filter.perPage ?? 20}&page=${filter.page ?? 1}`; }
    else { path = `/user/issues?per_page=${filter.perPage ?? 20}&page=${filter.page ?? 1}`; }
    const data = await this.p.httpClient.request<Record<string, unknown>[]>("GET", path);
    return makeList((Array.isArray(data) ? data : []).map((r: any) => new GiteeIssue(r, this.p.httpClient)));
  }
  async get(params: GetIssueParams): Promise<Issue> {
    const raw = await this.p.httpClient.request<Record<string, unknown>>("GET", `/repos/${params.repository}/issues/${params.iid}`);
    return new GiteeIssue(raw, this.p.httpClient);
  }
  async create(params: CreateIssueParams, repository: string): Promise<Issue> {
    const raw = await this.p.httpClient.request<Record<string, unknown>>("POST", `/repos/${repository}/issues`, {
      body: JSON.stringify({ title: params.title, body: params.description, labels: params.labels?.join(",") }),
    });
    return new GiteeIssue(raw, this.p.httpClient);
  }
}

class GiteeIssueProvider implements ToolProvider {
  constructor(private readonly p: GiteePlatform) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_issues", description: "List issues", inputSchema: z.object({ repository: z.string().optional(), state: z.enum(["open","closed"]).optional(), page: z.number().optional(), perPage: z.number().optional() }), execute: async (input) => JSON.stringify(await this.p.issues.list(input as any)) },
    { action: "get_issue", description: "Get an issue", inputSchema: z.object({ repository: z.string(), iid: z.number() }), execute: async (input) => JSON.stringify(await this.p.issues.get(input as any)) },
    { action: "create_issue", description: "Create an issue", inputSchema: z.object({ repository: z.string(), title: z.string(), description: z.string().optional(), labels: z.array(z.string()).optional() }), execute: async (input) => JSON.stringify(await this.p.issues.create(input as any, (input as any).repository)) },
    { action: "list_issue_notes", description: "List notes", inputSchema: z.object({ repository: z.string(), iid: z.number() }), execute: async (input) => { const issue = await this.p.issues.get(input as any); const notes: any[] = []; for await (const n of await issue.notes()) notes.push(n); return JSON.stringify(notes); } },
    { action: "create_issue_note", description: "Add note", inputSchema: z.object({ repository: z.string(), iid: z.number(), body: z.string() }), execute: async (input) => { const issue = await this.p.issues.get(input as any); return JSON.stringify(await issue.createNote((input as any).body)); } },
  ];}
}

// ── File ──
class GiteeFileCollection implements IFileCollection {
  constructor(private readonly p: GiteePlatform) {}
  async getContents(repository: string, path: string, ref?: string): Promise<{ path: string; content: string; encoding: string; size: number; sha: string }> {
    const qs = ref ? `?ref=${ref}` : "";
    const raw = await this.p.httpClient.request<Record<string, unknown>>("GET", `/repos/${repository}/contents/${path}${qs}`);
    const content = raw.content ? Buffer.from(raw.content as string, "base64").toString("utf-8") : "";
    return { path: raw.path as string ?? path, content, encoding: raw.encoding as string ?? "utf-8", size: raw.size as number, sha: raw.sha as string };
  }
  async createOrUpdate(repository: string, params: { path: string; content: string; branch: string; commitMessage: string }): Promise<{ filePath: string; branch: string; commitSha: string }> {
    const content = Buffer.from(params.content).toString("base64");
    const raw = await this.p.httpClient.request<Record<string, unknown>>("POST", `/repos/${repository}/contents/${params.path}`, {
      body: JSON.stringify({ content, message: params.commitMessage, branch: params.branch }),
    });
    return { filePath: params.path, branch: params.branch, commitSha: (raw.commit as any)?.sha as string ?? "" };
  }
  async pushFiles(repository: string, branch: string, files: { path: string; content: string }[], message: string): Promise<{ sha: string; branch: string; message: string }> {
    throw new Error("Gitee bulk push not yet implemented");
  }
}

class GiteeFileProvider implements ToolProvider {
  constructor(private readonly p: GiteePlatform) {}
  getTools(): ToolDescriptor[] { return [
    { action: "get_file_contents", description: "Get file contents", inputSchema: z.object({ repository: z.string(), path: z.string(), ref: z.string().optional() }), execute: async (input) => JSON.stringify(await this.p.files.getContents((input as any).repository, (input as any).path, (input as any).ref)) },
    { action: "create_or_update_file", description: "Create or update file", inputSchema: z.object({ repository: z.string(), path: z.string(), content: z.string(), branch: z.string(), commitMessage: z.string() }), execute: async (input) => JSON.stringify(await this.p.files.createOrUpdate((input as any).repository, input as any)) },
  ];}
}

// ── Branch ──
class GiteeBranchCollection implements IBranchCollection {
  constructor(private readonly p: GiteePlatform) {}
  async list(repository: string): Promise<PaginatedList<BranchInfo>> { return this.p.repositories.listBranches(repository); }
  async get(repository: string, name: string): Promise<BranchInfo> {
    const raw = await this.p.httpClient.request<Record<string, unknown>>("GET", `/repos/${repository}/branches/${encodeURIComponent(name)}`);
    return GiteeBranch.fromApi(raw);
  }
  async create(params: { repository: string; name: string; ref: string }): Promise<BranchInfo> {
    const raw = await this.p.httpClient.request<Record<string, unknown>>("POST", `/repos/${params.repository}/git/refs`, {
      body: JSON.stringify({ refs: `refs/heads/${params.name}`, sha: params.ref }),
    });
    return { name: params.name, sha: (raw.object as any)?.sha as string ?? "", protected: false };
  }
  async delete(params: { repository: string; name: string }): Promise<void> {
    await this.p.httpClient.request("DELETE", `/repos/${params.repository}/git/refs/heads/${encodeURIComponent(params.name)}`);
  }
}

class GiteeBranchProvider implements ToolProvider {
  constructor(private readonly p: GiteePlatform) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_branches", description: "List branches", inputSchema: z.object({ repository: z.string() }), execute: async (input) => JSON.stringify(await this.p.branches.list((input as any).repository)) },
    { action: "get_branch", description: "Get branch", inputSchema: z.object({ repository: z.string(), name: z.string() }), execute: async (input) => JSON.stringify(await this.p.branches.get((input as any).repository, (input as any).name)) },
    { action: "create_branch", description: "Create branch", inputSchema: z.object({ repository: z.string(), name: z.string(), ref: z.string() }), execute: async (input) => JSON.stringify(await this.p.branches.create(input as any)) },
  ];}
}
