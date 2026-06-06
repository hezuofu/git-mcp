import type { IPipelineCollection, ToolProvider, ToolDescriptor, PaginatedList, PipelineInfo, PipelineJob, JobArtifact, User } from "@git-mcp/core";
import { z } from "zod";
import type { GitHubHttpClient } from "./github-http-client.js";

function makeList<T>(items: T[]): PaginatedList<T> {
  return { items, totalCount: items.length, pageInfo: { currentPage: 1, perPage: 100 }, nextPage: async () => null, hasMore: () => false, [Symbol.asyncIterator]() { return items[Symbol.iterator]() as any; } } as any;
}
function mapUser(u: any): User { return u ? { id: String(u.id ?? ""), username: u.login ?? "", name: u.login ?? "", email: null, avatarUrl: u.avatar_url ?? "", platform: "github" } : { id: "", username: "", name: "", email: null, avatarUrl: "", platform: "github" }; }

// GitHub Actions = GitHub's pipeline/CI system
export class GitHubPipelineCollection implements IPipelineCollection {
  constructor(private readonly http: GitHubHttpClient) {}

  async list(repo: string, params?: { ref?: string; status?: string; page?: number; perPage?: number }): Promise<PaginatedList<PipelineInfo>> {
    let qs = `?per_page=${params?.perPage ?? 20}&page=${params?.page ?? 1}`;
    if (params?.ref) qs += `&branch=${encodeURIComponent(params.ref)}`;
    if (params?.status) qs += `&status=${params.status}`;
    const data = await this.http.request<{ workflow_runs: any[]; total_count: number }>("GET", `/repos/${repo}/actions/runs${qs}`);
    const runs = (data.workflow_runs ?? []).map((r: any) => ({
      id: String(r.id), projectId: String(r.repository?.id ?? ""), sha: r.head_sha ?? "", ref: r.head_branch ?? "",
      status: r.status === "completed" ? (r.conclusion ?? "completed") : r.status,
      source: r.event ?? "", createdAt: r.created_at, updatedAt: r.updated_at ?? r.created_at,
      webUrl: r.html_url ?? "", duration: null, user: mapUser(r.actor),
    }));
    return {
      items: runs, totalCount: data.total_count, pageInfo: { currentPage: params?.page ?? 1, perPage: params?.perPage ?? 20 },
      nextPage: async () => null, hasMore: () => false,
      [Symbol.asyncIterator]() { return runs[Symbol.iterator](); },
    } as unknown as PaginatedList<PipelineInfo>;
  }

  async get(repo: string, runId: string): Promise<PipelineInfo> {
    const r = await this.http.request<any>("GET", `/repos/${repo}/actions/runs/${runId}`);
    return { id: String(r.id), projectId: String(r.repository?.id ?? ""), sha: r.head_sha ?? "", ref: r.head_branch ?? "",
      status: r.status === "completed" ? (r.conclusion ?? "completed") : r.status, source: r.event ?? "",
      createdAt: r.created_at, updatedAt: r.updated_at ?? r.created_at, webUrl: r.html_url ?? "", duration: null, user: mapUser(r.actor) };
  }

  async getJobs(repo: string, runId: string): Promise<PipelineJob[]> {
    const data = await this.http.request<{ jobs: any[] }>("GET", `/repos/${repo}/actions/runs/${runId}/jobs?per_page=100`);
    return (data.jobs ?? []).map((j: any) => ({
      id: String(j.id), name: j.name, stage: j.steps?.[0]?.name ?? "", status: j.status === "completed" ? (j.conclusion ?? "completed") : j.status,
      createdAt: j.started_at ?? j.created_at ?? "", startedAt: j.started_at, finishedAt: j.completed_at,
      duration: null, webUrl: j.html_url ?? "",
    }));
  }

  async getJobOutput(repo: string, jobId: string): Promise<string> {
    const log = await this.http.request<string>("GET", `/repos/${repo}/actions/jobs/${jobId}/logs`);
    return typeof log === "string" ? log : JSON.stringify(log);
  }

  async create(repo: string, params: { ref: string }): Promise<PipelineInfo> {
    // GitHub Actions: dispatch a workflow_dispatch event
    const workflows = await this.http.request<{ workflows: any[] }>("GET", `/repos/${repo}/actions/workflows?per_page=100`);
    const dispatchable = (workflows.workflows ?? []).find((w: any) => w.state === "active");
    if (!dispatchable) throw new Error("No active workflows found for dispatch");
    await this.http.request("POST", `/repos/${repo}/actions/workflows/${dispatchable.id}/dispatches`, {
      body: JSON.stringify({ ref: params.ref }),
    });
    return { id: dispatchable.id, projectId: repo, sha: "", ref: params.ref, status: "queued", source: "workflow_dispatch",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), webUrl: dispatchable.html_url ?? "", duration: null, user: null };
  }

  async retry(repo: string, runId: string): Promise<PipelineInfo> {
    await this.http.request("POST", `/repos/${repo}/actions/runs/${runId}/rerun`);
    return this.get(repo, runId);
  }

  async cancel(repo: string, runId: string): Promise<PipelineInfo> {
    await this.http.request("POST", `/repos/${repo}/actions/runs/${runId}/cancel`);
    return this.get(repo, runId);
  }

  // GitHub Actions: "play job" = re-run failed jobs
  async playJob(repo: string, jobId: string): Promise<PipelineJob> {
    await this.http.request("POST", `/repos/${repo}/actions/jobs/${jobId}/rerun`);
    const job = await this.http.request<any>("GET", `/repos/${repo}/actions/jobs/${jobId}`);
    return { id: String(job.id), name: job.name, stage: "", status: job.status, createdAt: job.started_at ?? job.created_at ?? "",
      startedAt: job.started_at, finishedAt: job.completed_at, duration: null, webUrl: job.html_url ?? "" };
  }

  async retryJob(repo: string, jobId: string): Promise<PipelineJob> {
    return this.playJob(repo, jobId);
  }

  async cancelJob(repo: string, _jobId: string): Promise<PipelineJob> {
    // GitHub Actions doesn't have a cancel single job API; cancel the parent run instead
    // This is a platform limitation
    throw new Error("GitHub Actions does not support canceling individual jobs. Cancel the workflow run instead.");
  }

  async listJobArtifacts(repo: string, runId: string): Promise<JobArtifact[]> {
    const data = await this.http.request<{ artifacts: any[] }>("GET", `/repos/${repo}/actions/runs/${runId}/artifacts?per_page=100`);
    return (data.artifacts ?? []).map((a: any) => ({
      filename: a.name, size: a.size_in_bytes ?? 0, fileType: a.archived ? "zip" : "binary",
    }));
  }

  // For MR/PR pipelines, use check runs on the PR's head SHA
  async listMrPipelines(repo: string, mrIid: number): Promise<PipelineInfo[]> {
    const pr = await this.http.request<any>("GET", `/repos/${repo}/pulls/${mrIid}`);
    const sha = pr.head?.sha;
    if (!sha) return [];
    const data = await this.http.request<{ check_runs: any[] }>("GET", `/repos/${repo}/commits/${sha}/check-runs?per_page=100`);
    return (data.check_runs ?? []).map((c: any) => ({
      id: String(c.id), projectId: repo, sha: c.head_sha ?? sha, ref: pr.head?.ref ?? "",
      status: c.status === "completed" ? (c.conclusion ?? "completed") : c.status, source: "check_run",
      createdAt: c.started_at ?? "", updatedAt: c.completed_at ?? "", webUrl: c.html_url ?? "", duration: null, user: null,
    }));
  }
}

export class GitHubPipelineProvider implements ToolProvider {
  constructor(private readonly c: GitHubPipelineCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_pipelines", description: "List GitHub Actions workflow runs", inputSchema: z.object({ repository: z.string(), ref: z.string().optional(), status: z.string().optional(), page: z.number().optional(), perPage: z.number().optional() }), execute: async (i) => JSON.stringify(await this.c.list((i as any).repository, i as any)) },
    { action: "get_pipeline", description: "Get a workflow run", inputSchema: z.object({ repository: z.string(), runId: z.string() }), execute: async (i) => JSON.stringify(await this.c.get((i as any).repository, (i as any).runId)) },
    { action: "list_pipeline_jobs", description: "List jobs for a workflow run", inputSchema: z.object({ repository: z.string(), runId: z.string() }), execute: async (i) => JSON.stringify(await this.c.getJobs((i as any).repository, (i as any).runId)) },
    { action: "get_pipeline_job_output", description: "Get workflow job log", inputSchema: z.object({ repository: z.string(), jobId: z.string() }), execute: async (i) => JSON.stringify(await this.c.getJobOutput((i as any).repository, (i as any).jobId)) },
    { action: "create_pipeline", description: "Trigger a workflow via workflow_dispatch", inputSchema: z.object({ repository: z.string(), ref: z.string() }), execute: async (i) => JSON.stringify(await this.c.create((i as any).repository, i as any)) },
    { action: "retry_pipeline", description: "Re-run a workflow run", inputSchema: z.object({ repository: z.string(), runId: z.string() }), execute: async (i) => JSON.stringify(await this.c.retry((i as any).repository, (i as any).runId)) },
    { action: "cancel_pipeline", description: "Cancel a workflow run", inputSchema: z.object({ repository: z.string(), runId: z.string() }), execute: async (i) => JSON.stringify(await this.c.cancel((i as any).repository, (i as any).runId)) },
    { action: "play_pipeline_job", description: "Re-run a workflow job", inputSchema: z.object({ repository: z.string(), jobId: z.string() }), execute: async (i) => JSON.stringify(await this.c.playJob((i as any).repository, (i as any).jobId)) },
    { action: "retry_pipeline_job", description: "Re-run a workflow job", inputSchema: z.object({ repository: z.string(), jobId: z.string() }), execute: async (i) => JSON.stringify(await this.c.retryJob((i as any).repository, (i as any).jobId)) },
    { action: "list_job_artifacts", description: "List artifacts from a workflow run", inputSchema: z.object({ repository: z.string(), runId: z.string() }), execute: async (i) => JSON.stringify(await this.c.listJobArtifacts((i as any).repository, (i as any).runId)) },
    { action: "list_mr_pipelines", description: "List check runs for a PR", inputSchema: z.object({ repository: z.string(), mrIid: z.number() }), execute: async (i) => JSON.stringify(await this.c.listMrPipelines((i as any).repository, (i as any).mrIid)) },
  ]; }
}
