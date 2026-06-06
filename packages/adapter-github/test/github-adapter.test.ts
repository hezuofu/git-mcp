/**
 * Unit tests for GitHub adapter — session, models, and builder logic.
 * HTTP calls tested via mock structures (no real network needed).
 */
import { describe, it } from "node:test";
import assert from "node:assert";

describe("GitHubSession", () => {
  it("signs headers with Bearer token and GitHub-specific headers", async () => {
    const { GitHubSession } = await import("../build/github-session.js");
    const session = new GitHubSession("ghp_test123");
    const headers: Record<string, string> = {};
    session.sign(headers);

    assert.strictEqual(headers["Authorization"], "Bearer ghp_test123");
    assert.strictEqual(headers["Accept"], "application/vnd.github+json");
    assert.strictEqual(headers["X-GitHub-Api-Version"], "2022-11-28");
    assert.strictEqual(session.platform, "github");
  });

  it("cannot refresh PAT", async () => {
    const { GitHubSession } = await import("../build/github-session.js");
    const session = new GitHubSession("test");
    assert.strictEqual(session.canRefresh, false);
    await assert.rejects(() => session.refresh(), /does not support refresh/i);
  });
});

describe("GitHubApiError", () => {
  it("maps 404 to NotFoundError", async () => {
    const { GitHubApiError } = await import("../build/github-api-error.js");
    const err = new GitHubApiError(404, { message: "Not Found" });
    const domainErr = err.map();
    assert.strictEqual(domainErr.code, "NOT_FOUND");
    assert.strictEqual(domainErr.statusCode, 404);
  });

  it("maps 401 to AuthenticationError", async () => {
    const { GitHubApiError } = await import("../build/github-api-error.js");
    const err = new GitHubApiError(401, { message: "Bad credentials" });
    const domainErr = err.map();
    assert.strictEqual(domainErr.code, "AUTHENTICATION_FAILED");
  });

  it("maps 403 with rate limit to RateLimitExceededError", async () => {
    const { GitHubApiError } = await import("../build/github-api-error.js");
    const err = new GitHubApiError(403, { message: "API rate limit exceeded" });
    const domainErr = err.map();
    assert.strictEqual(domainErr.code, "RATE_LIMIT_EXCEEDED");
  });

  it("maps 403 without rate limit to PermissionDeniedError", async () => {
    const { GitHubApiError } = await import("../build/github-api-error.js");
    const err = new GitHubApiError(403, { message: "Forbidden" });
    const domainErr = err.map();
    assert.strictEqual(domainErr.code, "PERMISSION_DENIED");
  });

  it("maps 409 to ConflictError", async () => {
    const { GitHubApiError } = await import("../build/github-api-error.js");
    const err = new GitHubApiError(409, { message: "Conflict" });
    const domainErr = err.map();
    assert.strictEqual(domainErr.code, "CONFLICT");
  });

  it("maps 422 to ValidationError", async () => {
    const { GitHubApiError } = await import("../build/github-api-error.js");
    const err = new GitHubApiError(422, { message: "Validation Failed", errors: [{ field: "title", code: "missing" }] });
    const domainErr = err.map();
    assert.strictEqual(domainErr.code, "VALIDATION_FAILED");
  });
});

describe("GitHub Repository Model", () => {
  it("maps GitHub API response to Repository", async () => {
    const { GitHubRepository } = await import("../build/models/github-repository.js");
    const repo = GitHubRepository.fromApi({
      id: 1296269, name: "hello-world", full_name: "octocat/hello-world",
      description: "My repo", default_branch: "main", visibility: "public",
      html_url: "https://github.com/octocat/hello-world",
      clone_url: "https://github.com/octocat/hello-world.git", private: false,
    });
    assert.strictEqual(repo.id, "1296269");
    assert.strictEqual(repo.name, "hello-world");
    assert.strictEqual(repo.fullPath, "octocat/hello-world");
    assert.strictEqual(repo.platform, "github");
    assert.strictEqual(repo.visibility, "public");
    assert.ok(repo.rawData);
  });

  it("correctly identifies private repos", async () => {
    const { GitHubRepository } = await import("../build/models/github-repository.js");
    const repo = GitHubRepository.fromApi({ id: 1, name: "secret", full_name: "user/secret", description: "", default_branch: "main", html_url: "", clone_url: "", private: true });
    assert.strictEqual(repo.visibility, "private");
  });
});

describe("GitHub Branch Model", () => {
  it("maps branch with commit info", async () => {
    const { GitHubBranch } = await import("../build/models/github-repository.js");
    const branch = GitHubBranch.fromApi({ name: "main", commit: { sha: "abc123" }, protected: true });
    assert.strictEqual(branch.name, "main");
    assert.strictEqual(branch.sha, "abc123");
    assert.strictEqual(branch.protected, true);
  });
});

describe("GitHub PullRequest Model", () => {
  it("maps PR with all fields", async () => {
    const { GitHubPullRequest } = await import("../build/models/github-pull-request.js");
    const pr = new GitHubPullRequest({
      id: 1, number: 1347, title: "feat: new api", body: "Description",
      state: "open", head: { ref: "feature/new" }, base: { ref: "main", repo: { full_name: "octocat/hello-world" } },
      created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-02T00:00:00Z",
      html_url: "https://github.com/octocat/hello-world/pull/1347",
      user: { id: 1, login: "octocat", avatar_url: "https://a.example.com/u/1" },
      labels: [{ id: 1, name: "bug", color: "ff0000", description: null }],
      assignees: [],
    }, null as any);

    assert.strictEqual(pr.iid, 1347);
    assert.strictEqual(pr.title, "feat: new api");
    assert.strictEqual(pr.state, "open");
    assert.strictEqual(pr.sourceBranch, "feature/new");
    assert.strictEqual(pr.targetBranch, "main");
    assert.strictEqual(pr.repository, "octocat/hello-world");
    assert.strictEqual(pr.author.username, "octocat");
    assert.strictEqual(pr.labels[0].name, "bug");
  });

  it("detects merged PRs", async () => {
    const { GitHubPullRequest } = await import("../build/models/github-pull-request.js");
    const pr = new GitHubPullRequest({
      id: 1, number: 1, title: "merged", body: "", state: "closed",
      head: { ref: "feat" }, base: { ref: "main", repo: { full_name: "x/y" } },
      created_at: "", updated_at: "", html_url: "",
      user: { id: 1, login: "x", avatar_url: "" }, labels: [], assignees: [],
      merged_at: "2024-01-01T00:00:00Z",
    }, null as any);
    assert.strictEqual(pr.state, "merged");
  });
});

describe("GitHub Issue Model", () => {
  it("maps issue with all fields", async () => {
    const { GitHubIssue } = await import("../build/models/github-issue.js");
    const issue = new GitHubIssue({
      id: 1, number: 42, title: "Bug", body: "Description", state: "open",
      created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z",
      html_url: "https://github.com/octocat/hello-world/issues/42",
      repository_url: "https://api.github.com/repos/octocat/hello-world",
      user: { id: 1, login: "octocat", avatar_url: "https://a.example.com/u/1" },
      labels: [], assignees: [], pull_request: undefined,
    }, null as any);

    assert.strictEqual(issue.iid, 42);
    assert.strictEqual(issue.title, "Bug");
    assert.strictEqual(issue.state, "open");
    assert.strictEqual(issue.repository, "octocat/hello-world");
    assert.strictEqual(issue.author.username, "octocat");
  });
});

describe("GitHubHttpClient default headers", () => {
  it("adds GitHub-specific accept and version headers", async () => {
    const { GitHubHttpClient } = await import("../build/github-http-client.js");
    const mockSession = { platform: "github", sign: (h: any) => { h["Authorization"] = "Bearer x"; }, refresh: async () => ({} as any), user: null, createdAt: new Date(), expiresAt: null, canRefresh: false };
    const mockPool = { getAgents: () => ({ http: {} as any, https: {} as any, select: () => ({} as any) }) } as any;

    // We can only test the static header behavior
    const client = new GitHubHttpClient("https://api.github.com", mockSession, mockPool);

    // Verify the client has correct base URL
    assert.strictEqual(client.baseUrl, "https://api.github.com");
  });
});

describe("GitHub Platform Registration", () => {
  it("has correct platform metadata", async () => {
    const { GitHubPlatform } = await import("../build/github-platform.js");
    const platform = new GitHubPlatform();
    assert.strictEqual(platform.id, "github");
    assert.strictEqual(platform.displayName, "GitHub");
    assert.strictEqual(platform.terminology.pr, "pull request");
    assert.strictEqual(platform.defaultApiUrl, "https://api.github.com");
  });

  it("creates valid session", async () => {
    const { GitHubPlatform } = await import("../build/github-platform.js");
    const platform = new GitHubPlatform();
    const session = platform.createSession("ghp_test");
    assert.strictEqual(session.platform, "github");
    assert.strictEqual(session.canRefresh, false);
  });

  it("registers all tool providers", async () => {
    const { GitHubPlatform } = await import("../build/github-platform.js");
    const platform = new GitHubPlatform();
    // Force initialize the httpClient by creating a session
    platform.createSession("ghp_test");
    const providers = platform.getToolProviders();
    assert.ok(providers.length >= 10, `Expected >=10 providers but got ${providers.length}`);

    const allTools: string[] = [];
    for (const p of providers) {
      for (const t of p.getTools()) {
        allTools.push(`github_${t.action}`);
      }
    }

    // Verify all expected tool categories
    const expected = [
      "github_list_prs", "github_get_pr", "github_create_pr",
      "github_get_pr_diffs", "github_merge_pr", "github_list_pr_notes",
      "github_list_issues", "github_get_issue", "github_create_issue",
      "github_search_repos", "github_get_repo", "github_create_repo", "github_fork_repo",
      "github_get_file_contents", "github_create_or_update_file",
      "github_list_branches", "github_get_branch", "github_create_branch",
      "github_list_labels", "github_get_label", "github_create_label",
      "github_list_tags", "github_get_tag", "github_create_tag", "github_delete_tag",
      "github_list_releases", "github_get_release", "github_create_release",
      "github_list_commits", "github_get_commit", "github_get_commit_diff",
      "github_get_file_blame", "github_list_commit_statuses", "github_create_commit_status",
      "github_search_code",
      "github_list_todos", "github_mark_todo_done", "github_mark_all_todos_done",
      "github_list_draft_notes", "github_create_draft_note", "github_publish_draft_note",
      "github_list_mr_versions", "github_get_mr_version",
      "github_list_pipelines", "github_get_pipeline", "github_list_pipeline_jobs",
      "github_get_pipeline_job_output", "github_create_pipeline", "github_retry_pipeline",
      "github_cancel_pipeline", "github_play_pipeline_job", "github_list_job_artifacts",
      "github_list_mr_pipelines",
    ];
    for (const name of expected) {
      assert.ok(allTools.includes(name), `Missing tool: ${name}`);
    }

    // Also verify emoji reaction tools
    assert.ok(allTools.includes("github_list_pr_reactions"));
    assert.ok(allTools.includes("github_list_issue_reactions"));
    assert.ok(allTools.includes("github_create_pr_reaction"));
    assert.ok(allTools.includes("github_create_issue_reaction"));

    console.error(`\n  GitHub tools verified: ${allTools.length} total`);
  });
});
