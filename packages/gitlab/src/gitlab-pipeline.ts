import type { IPipelineCollection, ToolProvider, ToolDescriptor, PaginatedList, PipelineInfo, PipelineJob, JobArtifact, User } from "@git-mcp/core";
import { z } from "zod";
import type { GitLabHttpClient } from "./gitlab-http-client.js";

function mapUser(u: any): User { return { id: String(u.id), username: u.username, name: u.name, email: null, avatarUrl: u.avatar_url, platform: "gitlab" }; }
function makeList<T>(items: T[]): PaginatedList<T> { return { items, totalCount: items.length, pageInfo: { currentPage: 1, perPage: 100 }, nextPage: async () => null, hasMore: () => false, [Symbol.asyncIterator]() { return items[Symbol.iterator]() as any; } } as any; }

export class GitLabPipelineCollection implements IPipelineCollection {
  constructor(private readonly http: GitLabHttpClient) {}
  async list(repo: string, params?: { ref?: string; status?: string; page?: number; perPage?: number }): Promise<PaginatedList<PipelineInfo>> {
    let qs = `?per_page=${params?.perPage ?? 20}&page=${params?.page ?? 1}`;
    if (params?.ref) qs += `&ref=${encodeURIComponent(params.ref)}`;
    if (params?.status) qs += `&status=${params.status}`;
    const data = await this.http.request<any[]>("GET", `/projects/${encodeURIComponent(repo)}/pipelines${qs}`);
    return makeList(data.map(p => ({ id: String(p.id), projectId: String(p.project_id), sha: p.sha, ref: p.ref, status: p.status, source: p.source ?? "", createdAt: p.created_at, updatedAt: p.updated_at ?? p.created_at, webUrl: p.web_url, duration: p.duration as number ?? null, user: p.user ? mapUser(p.user) : null })));
  }
  async get(repo: string, pipelineId: string): Promise<PipelineInfo> {
    const p = await this.http.request<any>("GET", `/projects/${encodeURIComponent(repo)}/pipelines/${pipelineId}`);
    return { id: String(p.id), projectId: String(p.project_id), sha: p.sha, ref: p.ref, status: p.status, source: p.source ?? "", createdAt: p.created_at, updatedAt: p.updated_at ?? p.created_at, webUrl: p.web_url, duration: p.duration ?? null, user: p.user ? mapUser(p.user) : null };
  }
  async getJobs(repo: string, pipelineId: string): Promise<PipelineJob[]> {
    const data = await this.http.request<any[]>("GET", `/projects/${encodeURIComponent(repo)}/pipelines/${pipelineId}/jobs?per_page=100`);
    return data.map(j => ({ id: String(j.id), name: j.name, stage: j.stage ?? "", status: j.status, createdAt: j.created_at, startedAt: j.started_at, finishedAt: j.finished_at, duration: j.duration ?? null, webUrl: j.web_url }));
  }
  async getJobOutput(repo: string, jobId: string): Promise<string> {
    const data = await this.http.request<any>("GET", `/projects/${encodeURIComponent(repo)}/jobs/${jobId}/trace`);
    return typeof data === "string" ? data : JSON.stringify(data);
  }
  async create(repo: string, params: { ref: string }): Promise<PipelineInfo> {
    const p = await this.http.request<any>("POST", `/projects/${encodeURIComponent(repo)}/pipeline`, { body: JSON.stringify({ ref: params.ref }) });
    return { id: String(p.id), projectId: String(p.project_id), sha: p.sha, ref: p.ref, status: p.status, source: p.source ?? "", createdAt: p.created_at, updatedAt: p.updated_at ?? p.created_at, webUrl: p.web_url, duration: p.duration ?? null, user: p.user ? mapUser(p.user) : null };
  }
  async retry(repo: string, pipelineId: string): Promise<PipelineInfo> {
    const p = await this.http.request<any>("POST", `/projects/${encodeURIComponent(repo)}/pipelines/${pipelineId}/retry`);
    return { id: String(p.id), projectId: String(p.project_id), sha: p.sha, ref: p.ref, status: p.status, source: p.source ?? "", createdAt: p.created_at, updatedAt: p.updated_at ?? p.created_at, webUrl: p.web_url, duration: p.duration ?? null, user: p.user ? mapUser(p.user) : null };
  }
  async cancel(repo: string, pipelineId: string): Promise<PipelineInfo> {
    const p = await this.http.request<any>("POST", `/projects/${encodeURIComponent(repo)}/pipelines/${pipelineId}/cancel`);
    return { id: String(p.id), projectId: String(p.project_id), sha: p.sha, ref: p.ref, status: p.status, source: p.source ?? "", createdAt: p.created_at, updatedAt: p.updated_at ?? p.created_at, webUrl: p.web_url, duration: p.duration ?? null, user: p.user ? mapUser(p.user) : null };
  }
  async playJob(repo: string, jobId: string): Promise<PipelineJob> {
    const j = await this.http.request<any>("POST", `/projects/${encodeURIComponent(repo)}/jobs/${jobId}/play`);
    return { id: String(j.id), name: j.name, stage: j.stage ?? "", status: j.status, createdAt: j.created_at, startedAt: j.started_at, finishedAt: j.finished_at, duration: j.duration ?? null, webUrl: j.web_url };
  }
  async retryJob(repo: string, jobId: string): Promise<PipelineJob> {
    const j = await this.http.request<any>("POST", `/projects/${encodeURIComponent(repo)}/jobs/${jobId}/retry`);
    return { id: String(j.id), name: j.name, stage: j.stage ?? "", status: j.status, createdAt: j.created_at, startedAt: j.started_at, finishedAt: j.finished_at, duration: j.duration ?? null, webUrl: j.web_url };
  }
  async cancelJob(repo: string, jobId: string): Promise<PipelineJob> {
    const j = await this.http.request<any>("POST", `/projects/${encodeURIComponent(repo)}/jobs/${jobId}/cancel`);
    return { id: String(j.id), name: j.name, stage: j.stage ?? "", status: j.status, createdAt: j.created_at, startedAt: j.started_at, finishedAt: j.finished_at, duration: j.duration ?? null, webUrl: j.web_url };
  }
  async listJobArtifacts(repo: string, jobId: string): Promise<JobArtifact[]> {
    const data = await this.http.request<any[]>("GET", `/projects/${encodeURIComponent(repo)}/jobs/${jobId}/artifacts`);
    return data.map(a => ({ filename: a.filename, size: a.size, fileType: a.file_type ?? "" }));
  }
  async listMrPipelines(repo: string, mrIid: number): Promise<PipelineInfo[]> {
    const data = await this.http.request<any[]>("GET", `/projects/${encodeURIComponent(repo)}/merge_requests/${mrIid}/pipelines`);
    return data.map(p => ({ id: String(p.id), projectId: String(p.project_id), sha: p.sha, ref: p.ref, status: p.status, source: p.source ?? "", createdAt: p.created_at, updatedAt: p.updated_at ?? p.created_at, webUrl: p.web_url, duration: p.duration ?? null, user: p.user ? mapUser(p.user) : null }));
  }
}

export class GitLabPipelineProvider implements ToolProvider {
  constructor(private readonly c: GitLabPipelineCollection) {}
  getTools(): ToolDescriptor[] { return [
    { action: "list_pipelines", description: "List pipelines", inputSchema: z.object({ repository: z.string(), ref: z.string().optional(), status: z.string().optional(), page: z.number().optional(), perPage: z.number().optional() }), execute: async (i) => JSON.stringify(await this.c.list((i as any).repository, i as any)) },
    { action: "get_pipeline", description: "Get a pipeline", inputSchema: z.object({ repository: z.string(), pipelineId: z.string() }), execute: async (i) => JSON.stringify(await this.c.get((i as any).repository, (i as any).pipelineId)) },
    { action: "list_pipeline_jobs", description: "List pipeline jobs", inputSchema: z.object({ repository: z.string(), pipelineId: z.string() }), execute: async (i) => JSON.stringify(await this.c.getJobs((i as any).repository, (i as any).pipelineId)) },
    { action: "get_pipeline_job_output", description: "Get job output/trace", inputSchema: z.object({ repository: z.string(), jobId: z.string() }), execute: async (i) => JSON.stringify(await this.c.getJobOutput((i as any).repository, (i as any).jobId)) },
    { action: "create_pipeline", description: "Create a pipeline", inputSchema: z.object({ repository: z.string(), ref: z.string() }), execute: async (i) => JSON.stringify(await this.c.create((i as any).repository, i as any)) },
    { action: "retry_pipeline", description: "Retry a pipeline", inputSchema: z.object({ repository: z.string(), pipelineId: z.string() }), execute: async (i) => JSON.stringify(await this.c.retry((i as any).repository, (i as any).pipelineId)) },
    { action: "cancel_pipeline", description: "Cancel a pipeline", inputSchema: z.object({ repository: z.string(), pipelineId: z.string() }), execute: async (i) => JSON.stringify(await this.c.cancel((i as any).repository, (i as any).pipelineId)) },
    { action: "play_pipeline_job", description: "Play/run a manual job", inputSchema: z.object({ repository: z.string(), jobId: z.string() }), execute: async (i) => JSON.stringify(await this.c.playJob((i as any).repository, (i as any).jobId)) },
    { action: "retry_pipeline_job", description: "Retry a job", inputSchema: z.object({ repository: z.string(), jobId: z.string() }), execute: async (i) => JSON.stringify(await this.c.retryJob((i as any).repository, (i as any).jobId)) },
    { action: "cancel_pipeline_job", description: "Cancel a job", inputSchema: z.object({ repository: z.string(), jobId: z.string() }), execute: async (i) => JSON.stringify(await this.c.cancelJob((i as any).repository, (i as any).jobId)) },
    { action: "list_job_artifacts", description: "List job artifacts", inputSchema: z.object({ repository: z.string(), jobId: z.string() }), execute: async (i) => JSON.stringify(await this.c.listJobArtifacts((i as any).repository, (i as any).jobId)) },
    { action: "list_mr_pipelines", description: "List MR pipelines", inputSchema: z.object({ repository: z.string(), mrIid: z.number() }), execute: async (i) => JSON.stringify(await this.c.listMrPipelines((i as any).repository, (i as any).mrIid)) },
  ]; }
}
