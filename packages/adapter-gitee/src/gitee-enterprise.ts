/**
 * Gitee Enterprise API tools — based on mcp-gitee-ent reference implementation.
 * Enterprise API: https://api.gitee.com/enterprises/{enterprise}
 */
import type { PaginatedList, ToolProvider, ToolDescriptor, Repository, PullRequest, Issue, User, BranchInfo, PrFilter, GetPrParams, CreatePrParams, IssueFilter, GetIssueParams, CreateIssueParams } from "@git-mcp/core";
import type { IRepositoryCollection, IPrMrCollection, IIssueCollection } from "@git-mcp/core";
import { z } from "zod";
import type { GiteeHttpClient } from "./gitee-http-client.js";
import { GiteeRepository, GiteeBranch } from "./models/gitee-repository.js";
import { GiteePullRequest } from "./models/gitee-pull-request.js";
import { GiteeIssue } from "./models/gitee-issue.js";

function makeList<T>(items: T[]): PaginatedList<T> {
  return { items, totalCount: items.length, pageInfo: { currentPage: 1, perPage: 100 },
    nextPage: async () => null, hasMore: () => false,
    [Symbol.asyncIterator]() { return items[Symbol.iterator]() as any; } } as any;
}

// ═══════════════════════════════════════════════════════════════════
// Enterprise API Collection
// ═══════════════════════════════════════════════════════════════════

export class GiteeEnterpriseCollection {
  constructor(private readonly http: GiteeHttpClient) {}

  /** List enterprises the authenticated user belongs to */
  async listEnterprises(): Promise<any[]> {
    const data = await this.http.request<any[]>("GET", "/enterprises?per_page=100");
    return (data ?? []).map((e: any) => ({
      id: String(e.id), name: e.name, url: e.url, description: e.description ?? "",
      avatarUrl: e.avatar_url ?? "", memberCount: e.members_count ?? 0,
    }));
  }

  /** List members of an enterprise */
  async listMembers(enterprise: string): Promise<PaginatedList<any>> {
    const data = await this.http.request<any[]>("GET", `/enterprises/${enterprise}/members?per_page=100`);
    return makeList((data ?? []).map((m: any) => ({
      id: String(m.id), username: m.username ?? m.login, name: m.name ?? m.username ?? "",
      email: m.email ?? null, avatarUrl: m.avatar_url ?? "",
      role: m.role ?? "member",
    })));
  }

  /** List groups/teams of an enterprise */
  async listGroups(enterprise: string): Promise<PaginatedList<any>> {
    const data = await this.http.request<any[]>("GET", `/enterprises/${enterprise}/groups?per_page=100`);
    return makeList((data ?? []).map((g: any) => ({
      id: String(g.id), name: g.name, description: g.description ?? "", memberCount: g.members_count ?? 0,
    })));
  }

  /** List enterprise repositories */
  async listRepos(enterprise: string, params?: { search?: string; page?: number; perPage?: number }): Promise<PaginatedList<Repository>> {
    const qs = `?per_page=${params?.perPage ?? 20}&page=${params?.page ?? 1}${params?.search ? `&search=${encodeURIComponent(params.search)}` : ""}`;
    const data = await this.http.request<any[]>("GET", `/enterprises/${enterprise}/repos${qs}`);
    return makeList((data ?? []).map((r: any) => GiteeRepository.fromApi(r)));
  }

  /** Create enterprise repository */
  async createRepo(enterprise: string, params: { name: string; description?: string; private?: boolean }): Promise<Repository> {
    const r = await this.http.request<any>("POST", `/enterprises/${enterprise}/repos`, {
      body: JSON.stringify({ name: params.name, description: params.description, private: params.private ?? false }),
    });
    return GiteeRepository.fromApi(r);
  }

  /** Get enterprise repo file tree */
  async getRepoTree(enterprise: string, repo: string, path?: string, ref?: string): Promise<any[]> {
    const qs = `?${path ? `path=${encodeURIComponent(path)}&` : ""}${ref ? `ref=${ref}` : ""}`;
    const data = await this.http.request<any[]>("GET", `/enterprises/${enterprise}/repos/${repo}/git/trees/master${qs}`);
    return (data ?? []).map((t: any) => ({
      path: t.path, type: t.type, sha: t.sha, size: t.size ?? 0, url: t.url ?? "",
    }));
  }

  /** List enterprise branches */
  async listBranches(enterprise: string, repo: string): Promise<PaginatedList<BranchInfo>> {
    const data = await this.http.request<any[]>("GET", `/enterprises/${enterprise}/repos/${repo}/branches?per_page=100`);
    return makeList(data.map(b => GiteeBranch.fromApi(b)));
  }
}

// ═══════════════════════════════════════════════════════════════════
// Enterprise PR Collection
// ═══════════════════════════════════════════════════════════════════

export class GiteeEnterprisePrCollection implements IPrMrCollection {
  constructor(private readonly http: GiteeHttpClient, private readonly enterprise: string) {}

  async list(filter: PrFilter): Promise<PaginatedList<PullRequest>> {
    let path: string;
    if (filter.repository) {
      path = `/enterprises/${this.enterprise}/repos/${filter.repository}/pulls?state=${filter.state ?? "open"}&per_page=${filter.perPage ?? 20}&page=${filter.page ?? 1}`;
    } else {
      path = `/enterprises/${this.enterprise}/pulls?state=${filter.state ?? "open"}&per_page=${filter.perPage ?? 20}&page=${filter.page ?? 1}`;
    }
    const data = await this.http.request<any[]>("GET", path);
    return makeList((Array.isArray(data) ? data : []).map((r: any) => new GiteePullRequest(r, this.http)));
  }

  async get(params: GetPrParams): Promise<PullRequest> {
    const raw = await this.http.request<any>("GET", `/enterprises/${this.enterprise}/repos/${params.repository}/pulls/${params.iid}`);
    return new GiteePullRequest(raw, this.http);
  }

  async create(params: CreatePrParams, repository: string): Promise<PullRequest> {
    const raw = await this.http.request<any>("POST", `/enterprises/${this.enterprise}/repos/${repository}/pulls`, {
      body: JSON.stringify({ title: params.title, head: params.sourceBranch, base: params.targetBranch, body: params.description }),
    });
    return new GiteePullRequest(raw, this.http);
  }
}

// ═══════════════════════════════════════════════════════════════════
// Enterprise Issue Collection
// ═══════════════════════════════════════════════════════════════════

export class GiteeEnterpriseIssueCollection implements IIssueCollection {
  constructor(private readonly http: GiteeHttpClient, private readonly enterprise: string) {}

  async list(filter: IssueFilter): Promise<PaginatedList<Issue>> {
    let path: string;
    if (filter.repository) {
      path = `/enterprises/${this.enterprise}/repos/${filter.repository}/issues?state=${filter.state ?? "open"}&per_page=${filter.perPage ?? 20}&page=${filter.page ?? 1}`;
    } else {
      path = `/enterprises/${this.enterprise}/issues?state=${filter.state ?? "open"}&per_page=${filter.perPage ?? 20}&page=${filter.page ?? 1}`;
    }
    const data = await this.http.request<any[]>("GET", path);
    return makeList((Array.isArray(data) ? data : []).map((r: any) => new GiteeIssue(r, this.http)));
  }

  async get(params: GetIssueParams): Promise<Issue> {
    const raw = await this.http.request<any>("GET", `/enterprises/${this.enterprise}/repos/${params.repository}/issues/${params.iid}`);
    return new GiteeIssue(raw, this.http);
  }

  async create(params: CreateIssueParams, repository: string): Promise<Issue> {
    const raw = await this.http.request<any>("POST", `/enterprises/${this.enterprise}/repos/${repository}/issues`, {
      body: JSON.stringify({ title: params.title, body: params.description, labels: params.labels?.join(",") }),
    });
    return new GiteeIssue(raw, this.http);
  }
}

// ═══════════════════════════════════════════════════════════════════
// Tool Providers
// ═══════════════════════════════════════════════════════════════════

export class GiteeEnterpriseTools {
  static getTools(http: GiteeHttpClient): ToolDescriptor[] {
    const ent = new GiteeEnterpriseCollection(http);

    return [
      // ── Enterprise ──
      {
        action: "list_enterprises", description: "List enterprises the authenticated user belongs to",
        inputSchema: z.object({}),
        execute: async () => JSON.stringify(await ent.listEnterprises()),
      },
      {
        action: "list_enterprise_members", description: "List members of an enterprise",
        inputSchema: z.object({ enterprise: z.string().describe("Enterprise path or ID") }),
        execute: async (i: any) => JSON.stringify(await ent.listMembers(i.enterprise)),
      },
      {
        action: "list_enterprise_groups", description: "List groups/teams of an enterprise",
        inputSchema: z.object({ enterprise: z.string() }),
        execute: async (i: any) => JSON.stringify(await ent.listGroups(i.enterprise)),
      },
      // ── Enterprise Repos ──
      {
        action: "list_enterprise_repos", description: "List repositories in an enterprise",
        inputSchema: z.object({ enterprise: z.string(), search: z.string().optional(), page: z.number().optional(), perPage: z.number().optional() }),
        execute: async (i: any) => JSON.stringify(await ent.listRepos(i.enterprise, i)),
      },
      {
        action: "create_enterprise_repo", description: "Create a repository in an enterprise",
        inputSchema: z.object({ enterprise: z.string(), name: z.string(), description: z.string().optional(), private: z.boolean().optional() }),
        execute: async (i: any) => JSON.stringify(await ent.createRepo(i.enterprise, i)),
      },
      // ── Enterprise Repo Tree ──
      {
        action: "get_repo_tree", description: "Get repository directory tree",
        inputSchema: z.object({ repository: z.string(), path: z.string().optional(), ref: z.string().optional() }),
        execute: async (i: any) => JSON.stringify(await ent.getRepoTree("", i.repository, i.path, i.ref)),
      },
      // ── Enterprise PR ──
      {
        action: "list_enterprise_prs", description: "List enterprise pull requests (specify enterprise and optionally repository)",
        inputSchema: z.object({ enterprise: z.string(), repository: z.string().optional(), state: z.enum(["open","closed","merged"]).optional(), page: z.number().optional(), perPage: z.number().optional() }),
        execute: async (i: any) => {
          const prs = new GiteeEnterprisePrCollection(http, i.enterprise);
          return JSON.stringify(await prs.list({ repository: i.repository, state: i.state, page: i.page, perPage: i.perPage }));
        },
      },
      {
        action: "get_enterprise_pr", description: "Get enterprise pull request detail",
        inputSchema: z.object({ enterprise: z.string(), repository: z.string(), iid: z.number() }),
        execute: async (i: any) => {
          const prs = new GiteeEnterprisePrCollection(http, i.enterprise);
          return JSON.stringify(await prs.get({ repository: i.repository, iid: i.iid }));
        },
      },
      {
        action: "create_enterprise_pr", description: "Create enterprise pull request",
        inputSchema: z.object({ enterprise: z.string(), repository: z.string(), title: z.string(), sourceBranch: z.string(), targetBranch: z.string(), description: z.string().optional() }),
        execute: async (i: any) => {
          const prs = new GiteeEnterprisePrCollection(http, i.enterprise);
          return JSON.stringify(await prs.create(i, i.repository));
        },
      },
      // ── Enterprise Issue ──
      {
        action: "list_enterprise_issues", description: "List enterprise issues",
        inputSchema: z.object({ enterprise: z.string(), repository: z.string().optional(), state: z.enum(["open","closed"]).optional(), page: z.number().optional(), perPage: z.number().optional() }),
        execute: async (i: any) => {
          const issues = new GiteeEnterpriseIssueCollection(http, i.enterprise);
          return JSON.stringify(await issues.list({ repository: i.repository, state: i.state }));
        },
      },
      {
        action: "get_enterprise_issue", description: "Get enterprise issue detail",
        inputSchema: z.object({ enterprise: z.string(), repository: z.string(), iid: z.number() }),
        execute: async (i: any) => {
          const issues = new GiteeEnterpriseIssueCollection(http, i.enterprise);
          return JSON.stringify(await issues.get({ repository: i.repository, iid: i.iid }));
        },
      },
      {
        action: "create_enterprise_issue", description: "Create enterprise issue",
        inputSchema: z.object({ enterprise: z.string(), repository: z.string(), title: z.string(), description: z.string().optional(), labels: z.array(z.string()).optional() }),
        execute: async (i: any) => {
          const issues = new GiteeEnterpriseIssueCollection(http, i.enterprise);
          return JSON.stringify(await issues.create(i, i.repository));
        },
      },
      // ── User Info ──
      {
        action: "get_user_info", description: "Get current authenticated user info",
        inputSchema: z.object({}),
        execute: async () => JSON.stringify(await http.request<any>("GET", "/user")),
      },
    ];
  }
}
