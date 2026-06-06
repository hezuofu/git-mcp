import {
  GitPlatform, ConnectionPool, CreatePrBuilder, CreateIssueBuilder,
} from "@git-mcp/core";
import type {
  PlatformId, User, AuthenticatedSession,
  IRepositoryCollection, IPrMrCollection, IIssueCollection,
  IFileCollection, IBranchCollection,
  PaginatedList, Repository, SearchReposParams, GetRepoParams,
  CreateRepoParams, ForkRepoParams, BranchInfo,
  PullRequest, PrFilter, GetPrParams, CreatePrParams,
  Issue, IssueFilter, GetIssueParams, CreateIssueParams,
  ToolProvider, ToolDescriptor,
} from "@git-mcp/core";
import { z } from "zod";
import { GitHubSession } from "./github-session.js";
import { GitHubHttpClient } from "./github-http-client.js";
import { GitHubRepository, GitHubBranch } from "./models/github-repository.js";
import { GitHubPullRequest } from "./models/github-pull-request.js";
import { GitHubIssue } from "./models/github-issue.js";

export class GitHubPlatform extends GitPlatform {
  readonly id: PlatformId = "github";
  readonly displayName = "GitHub";
  readonly defaultApiUrl = "https://api.github.com";
  readonly terminology = { pr: "pull request" };

  private _http: GitHubHttpClient | null = null;
  private _pool: ConnectionPool = new ConnectionPool({});

  get httpClient(): GitHubHttpClient {
    if (!this._http) throw new Error("GitHubPlatform not initialized. Call registerSession first.");
    return this._http;
  }

  registerSession(session: AuthenticatedSession, apiUrl?: string): void {
    const baseUrl = (apiUrl ?? this.defaultApiUrl);
    this._http = new GitHubHttpClient(baseUrl, session, this._pool);
  }

  createSession(token: string, apiUrl?: string): AuthenticatedSession {
    const session = new GitHubSession(token);
    this.registerSession(session, apiUrl);
    return session;
  }

  createHttpClient(session: AuthenticatedSession, pool: ConnectionPool, apiUrl?: string): GitHubHttpClient {
    return new GitHubHttpClient(apiUrl ?? this.defaultApiUrl, session, pool);
  }

  protected async _resolveUser(session: AuthenticatedSession): Promise<User> {
    const data = await this.httpClient.request<Record<string, unknown>>("GET", "/user");
    return {
      id: String(data.id), username: data.login as string,
      name: (data.name as string) ?? (data.login as string),
      email: (data.email as string) ?? null, avatarUrl: data.avatar_url as string,
      platform: "github",
    };
  }

  buildApiError(statusCode: number, body: unknown): Error {
    const { GitHubApiError } = require("./github-api-error.js");
    return new GitHubApiError(statusCode, body);
  }

  getToolProviders(): ToolProvider[] {
    return [
      new GitHubRepoProvider(this),
      new GitHubPrProvider(this),
      new GitHubIssueProvider(this),
      new GitHubFileProvider(this),
      new GitHubBranchProvider(this),
    ];
  }

  get repositories(): IRepositoryCollection { return new GitHubRepoCollection(this); }
  get pullRequests(): IPrMrCollection { return new GitHubPrCollection(this); }
  get issues(): IIssueCollection { return new GitHubIssueCollection(this); }
  get files(): IFileCollection { return new GitHubFileCollection(this); }
  get branches(): IBranchCollection { return new GitHubBranchCollection(this); }
}

// ── Repo ──
class GitHubRepoCollection implements IRepositoryCollection {
  constructor(private readonly p: GitHubPlatform) {}
  async search(c: SearchReposParams): Promise<PaginatedList<Repository>> {
    const q = c.search ? `${c.search} in:name` : "stars:>0";
    const data = await this.p.httpClient.request<{ items: Record<string, unknown>[]; total_count: number }>(
      "GET", `/search/repositories?q=${encodeURIComponent(q)}&per_page=${c.perPage ?? 20}&page=${c.page ?? 1}`,
    );
    const items = data.items.map(r => GitHubRepository.fromApi(r));
    return makeList(items, data.total_count, c.page ?? 1, c.perPage ?? 20);
  }
  async get(params: GetRepoParams): Promise<Repository> {
    const raw = await this.p.httpClient.request<Record<string, unknown>>("GET", `/repos/${params.path}`);
    return GitHubRepository.fromApi(raw);
  }
  async create(params: CreateRepoParams): Promise<Repository> {
    const raw = await this.p.httpClient.request<Record<string, unknown>>("POST", "/user/repos", {
      body: JSON.stringify({ name: params.name, description: params.description, private: params.visibility === "private" }),
    });
    return GitHubRepository.fromApi(raw);
  }
  async fork(params: ForkRepoParams): Promise<Repository> {
    const path = params.targetNamespace
      ? `/repos/${params.path}/fork?organization=${params.targetNamespace}`
      : `/repos/${params.path}/fork`;
    const raw = await this.p.httpClient.request<Record<string, unknown>>("POST", path);
    return GitHubRepository.fromApi(raw);
  }
  async listBranches(repoPath: string): Promise<PaginatedList<BranchInfo>> {
    const data = await this.p.httpClient.request<Record<string, unknown>[]>("GET", `/repos/${repoPath}/branches?per_page=100`);
    return makeSimpleList(data.map(r => GitHubBranch.fromApi(r)));
  }
}

class GitHubRepoProvider implements ToolProvider {
  constructor(private readonly p: GitHubPlatform) {}
  getTools(): ToolDescriptor[] { return [
    { action: "search_repos", description: "Search GitHub repositories", inputSchema: z.object({ search: z.string().optional(), page: z.number().optional(), perPage: z.number().optional() }), execute: async (input) => JSON.stringify(await this.p.repositories.search(input as any)) },
    { action: "get_repo", description: "Get a GitHub repository by path", inputSchema: z.object({ path: z.string() }), execute: async (input) => JSON.stringify(await this.p.repositories.get(input as any)) },
    { action: "create_repo", description: "Create a GitHub repository", inputSchema: z.object({ name: z.string(), description: z.string().optional(), visibility: z.enum(["private","public"]).optional() }), execute: async (input) => JSON.stringify(await this.p.repositories.create(input as any)) },
    { action: "fork_repo", description: "Fork a GitHub repository", inputSchema: z.object({ path: z.string(), targetNamespace: z.string().optional() }), execute: async (input) => JSON.stringify(await this.p.repositories.fork(input as any)) },
  ];}
}

// ── PR ──
class GitHubPrCollection implements IPrMrCollection {
  constructor(private readonly p: GitHubPlatform) {}
  async list(filter: PrFilter): Promise<PaginatedList<PullRequest>> {
    let path: string; let isSearch = false;
    if (filter.repository) { path = `/repos/${filter.repository}/pulls?state=${filter.state ?? "open"}&per_page=${filter.perPage ?? 20}&page=${filter.page ?? 1}`; }
    else { path = `/search/issues?q=is:pr+author:@me&per_page=${filter.perPage ?? 20}&page=${filter.page ?? 1}`; isSearch = true; }
    const data = await this.p.httpClient.request<any>("GET", path);
    const rawItems = isSearch ? (data.items ?? []) : (Array.isArray(data) ? data : []);
    const items = rawItems.map((r: any) => new GitHubPullRequest(r, this.p.httpClient));
    return makeList(items, data.total_count ?? null, filter.page ?? 1, filter.perPage ?? 20);
  }
  async get(params: GetPrParams): Promise<PullRequest> {
    const raw = await this.p.httpClient.request<Record<string, unknown>>("GET", `/repos/${params.repository}/pulls/${params.iid}`);
    return new GitHubPullRequest(raw, this.p.httpClient);
  }
  async create(params: CreatePrParams, repository: string): Promise<PullRequest> {
    const raw = await this.p.httpClient.request<Record<string, unknown>>("POST", `/repos/${repository}/pulls`, {
      body: JSON.stringify({ title: params.title, head: params.sourceBranch, base: params.targetBranch, body: params.description, draft: params.draft }),
    });
    return new GitHubPullRequest(raw, this.p.httpClient);
  }
}

class GitHubPrProvider implements ToolProvider {
  constructor(private readonly p: GitHubPlatform) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_prs", description: "List {term:pr} with filtering", inputSchema: z.object({ repository: z.string().optional(), state: z.enum(["open","closed","merged"]).optional(), page: z.number().optional(), perPage: z.number().optional() }), execute: async (input) => JSON.stringify(await this.p.pullRequests.list(input as any)) },
    { action: "get_pr", description: "Get a {term:pr} by IID", inputSchema: z.object({ repository: z.string(), iid: z.number() }), execute: async (input) => JSON.stringify(await this.p.pullRequests.get(input as any)) },
    { action: "create_pr", description: "Create a {term:pr}", inputSchema: z.object({ repository: z.string(), title: z.string(), sourceBranch: z.string(), targetBranch: z.string(), description: z.string().optional(), draft: z.boolean().optional() }), execute: async (input) => JSON.stringify(await this.p.pullRequests.create(input as any, (input as any).repository)) },
    { action: "get_pr_diffs", description: "Get file changes of a {term:pr}", inputSchema: z.object({ repository: z.string(), iid: z.number() }), execute: async (input) => { const pr = await this.p.pullRequests.get(input as any); return JSON.stringify(await pr.diffs()); } },
    { action: "merge_pr", description: "Merge a {term:pr}", inputSchema: z.object({ repository: z.string(), iid: z.number(), method: z.enum(["merge","squash","rebase"]).optional() }), execute: async (input) => { const pr = await this.p.pullRequests.get(input as any); return JSON.stringify(await pr.merge({ method: (input as any).method })); } },
    { action: "list_pr_notes", description: "List notes on a {term:pr}", inputSchema: z.object({ repository: z.string(), iid: z.number() }), execute: async (input) => { const pr = await this.p.pullRequests.get(input as any); const notes = []; for await (const n of await pr.notes()) notes.push(n); return JSON.stringify(notes); } },
  ];}
}

// ── Issue ──
class GitHubIssueCollection implements IIssueCollection {
  constructor(private readonly p: GitHubPlatform) {}
  async list(filter: IssueFilter): Promise<PaginatedList<Issue>> {
    let path: string;
    if (filter.repository) { path = `/repos/${filter.repository}/issues?state=${filter.state ?? "open"}&per_page=${filter.perPage ?? 20}&page=${filter.page ?? 1}`; }
    else { path = `/issues?filter=all&per_page=${filter.perPage ?? 20}&page=${filter.page ?? 1}`; }
    const data = await this.p.httpClient.request<any[]>("GET", path);
    const issues = (Array.isArray(data) ? data : (data as any).items ?? [])
      .filter((r: any) => !r.pull_request)
      .map((r: any) => new GitHubIssue(r, this.p.httpClient));
    return makeSimpleList(issues);
  }
  async get(params: GetIssueParams): Promise<Issue> {
    const raw = await this.p.httpClient.request<Record<string, unknown>>("GET", `/repos/${params.repository}/issues/${params.iid}`);
    return new GitHubIssue(raw, this.p.httpClient);
  }
  async create(params: CreateIssueParams, repository: string): Promise<Issue> {
    const raw = await this.p.httpClient.request<Record<string, unknown>>("POST", `/repos/${repository}/issues`, {
      body: JSON.stringify({ title: params.title, body: params.description, labels: params.labels }),
    });
    return new GitHubIssue(raw, this.p.httpClient);
  }
}

class GitHubIssueProvider implements ToolProvider {
  constructor(private readonly p: GitHubPlatform) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_issues", description: "List issues with filtering", inputSchema: z.object({ repository: z.string().optional(), state: z.enum(["open","closed"]).optional(), page: z.number().optional(), perPage: z.number().optional() }), execute: async (input) => JSON.stringify(await this.p.issues.list(input as any)) },
    { action: "get_issue", description: "Get an issue by IID", inputSchema: z.object({ repository: z.string(), iid: z.number() }), execute: async (input) => JSON.stringify(await this.p.issues.get(input as any)) },
    { action: "create_issue", description: "Create an issue", inputSchema: z.object({ repository: z.string(), title: z.string(), description: z.string().optional(), labels: z.array(z.string()).optional() }), execute: async (input) => JSON.stringify(await this.p.issues.create(input as any, (input as any).repository)) },
    { action: "list_issue_notes", description: "List notes on an issue", inputSchema: z.object({ repository: z.string(), iid: z.number() }), execute: async (input) => { const issue = await this.p.issues.get(input as any); const notes: any[] = []; for await (const n of await issue.notes()) notes.push(n); return JSON.stringify(notes); } },
    { action: "create_issue_note", description: "Add a note to an issue", inputSchema: z.object({ repository: z.string(), iid: z.number(), body: z.string() }), execute: async (input) => { const issue = await this.p.issues.get(input as any); return JSON.stringify(await issue.createNote((input as any).body)); } },
  ];}
}

// ── File ──
class GitHubFileCollection implements IFileCollection {
  constructor(private readonly p: GitHubPlatform) {}
  async getContents(repository: string, path: string, ref?: string): Promise<{ path: string; content: string; encoding: string; size: number; sha: string }> {
    const qs = ref ? `?ref=${ref}` : "";
    const raw = await this.p.httpClient.request<Record<string, unknown>>("GET", `/repos/${repository}/contents/${path}${qs}`);
    const content = raw.content ? Buffer.from(raw.content as string, "base64").toString("utf-8") : "";
    return { path: raw.path as string, content, encoding: raw.encoding as string ?? "utf-8", size: raw.size as number, sha: raw.sha as string };
  }
  async createOrUpdate(repository: string, params: { path: string; content: string; branch: string; commitMessage: string }): Promise<{ filePath: string; branch: string; commitSha: string }> {
    const content = Buffer.from(params.content).toString("base64");
    const raw = await this.p.httpClient.request<Record<string, unknown>>("PUT", `/repos/${repository}/contents/${params.path}`, {
      body: JSON.stringify({ message: params.commitMessage, content, branch: params.branch }),
    });
    return { filePath: params.path, branch: params.branch, commitSha: (raw.commit as any)?.sha as string ?? "" };
  }
  async pushFiles(repository: string, branch: string, files: { path: string; content: string }[], message: string): Promise<{ sha: string; branch: string; message: string }> {
    const blobs = await Promise.all(files.map(async f => {
      const r = await this.p.httpClient.request<Record<string, unknown>>("POST", `/repos/${repository}/git/blobs`, {
        body: JSON.stringify({ content: f.content, encoding: "utf-8" }),
      });
      return { path: f.path, sha: r.sha as string };
    }));
    const refData = await this.p.httpClient.request<Record<string, unknown>>("GET", `/repos/${repository}/git/ref/heads/${branch}`);
    const baseSha = (refData.object as any)?.sha as string;
    const baseCommit = await this.p.httpClient.request<Record<string, unknown>>("GET", `/repos/${repository}/git/commits/${baseSha}`);
    const treeData = await this.p.httpClient.request<Record<string, unknown>>("POST", `/repos/${repository}/git/trees`, {
      body: JSON.stringify({ base_tree: (baseCommit.tree as any)?.sha, tree: blobs.map(b => ({ path: b.path, mode: "100644", type: "blob", sha: b.sha })) }),
    });
    const newCommit = await this.p.httpClient.request<Record<string, unknown>>("POST", `/repos/${repository}/git/commits`, {
      body: JSON.stringify({ message, tree: treeData.sha, parents: [baseSha] }),
    });
    await this.p.httpClient.request("PATCH", `/repos/${repository}/git/refs/heads/${branch}`, {
      body: JSON.stringify({ sha: newCommit.sha, force: false }),
    });
    return { sha: newCommit.sha as string, branch, message };
  }
}

class GitHubFileProvider implements ToolProvider {
  constructor(private readonly p: GitHubPlatform) {}
  getTools(): ToolDescriptor[] { return [
    { action: "get_file_contents", description: "Get file contents from a GitHub repository", inputSchema: z.object({ repository: z.string(), path: z.string(), ref: z.string().optional() }), execute: async (input) => JSON.stringify(await this.p.files.getContents((input as any).repository, (input as any).path, (input as any).ref)) },
    { action: "create_or_update_file", description: "Create or update a file in a GitHub repository", inputSchema: z.object({ repository: z.string(), path: z.string(), content: z.string(), branch: z.string(), commitMessage: z.string() }), execute: async (input) => JSON.stringify(await this.p.files.createOrUpdate((input as any).repository, input as any)) },
  ];}
}

// ── Branch ──
class GitHubBranchCollection implements IBranchCollection {
  constructor(private readonly p: GitHubPlatform) {}
  async list(repository: string): Promise<PaginatedList<BranchInfo>> { return this.p.repositories.listBranches(repository); }
  async get(repository: string, name: string): Promise<BranchInfo> {
    const raw = await this.p.httpClient.request<Record<string, unknown>>("GET", `/repos/${repository}/branches/${name}`);
    return GitHubBranch.fromApi(raw);
  }
  async create(params: { repository: string; name: string; ref: string }): Promise<BranchInfo> {
    const refData = await this.p.httpClient.request<Record<string, unknown>>("GET", `/repos/${params.repository}/git/ref/heads/${params.ref}`);
    const sha = (refData.object as any)?.sha as string;
    await this.p.httpClient.request("POST", `/repos/${params.repository}/git/refs`, {
      body: JSON.stringify({ ref: `refs/heads/${params.name}`, sha }),
    });
    return { name: params.name, sha, protected: false };
  }
  async delete(params: { repository: string; name: string }): Promise<void> {
    await this.p.httpClient.request("DELETE", `/repos/${params.repository}/git/refs/heads/${params.name}`);
  }
}

class GitHubBranchProvider implements ToolProvider {
  constructor(private readonly p: GitHubPlatform) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_branches", description: "List branches in a GitHub repository", inputSchema: z.object({ repository: z.string(), search: z.string().optional() }), execute: async (input) => JSON.stringify(await this.p.branches.list((input as any).repository)) },
    { action: "get_branch", description: "Get a branch by name", inputSchema: z.object({ repository: z.string(), name: z.string() }), execute: async (input) => JSON.stringify(await this.p.branches.get((input as any).repository, (input as any).name)) },
    { action: "create_branch", description: "Create a new branch", inputSchema: z.object({ repository: z.string(), name: z.string(), ref: z.string() }), execute: async (input) => JSON.stringify(await this.p.branches.create(input as any)) },
  ];}
}

// ── Helpers ──
function makeList<T>(items: T[], total: number | null, page: number, perPage: number): PaginatedList<T> {
  return {
    items, totalCount: total, pageInfo: { currentPage: page, perPage },
    nextPage: async () => null, hasMore: () => false,
    [Symbol.asyncIterator]() { return items[Symbol.iterator]() as any; },
  } as unknown as PaginatedList<T>;
}

function makeSimpleList<T>(items: T[]): PaginatedList<T> {
  return makeList(items, items.length, 1, 100);
}
