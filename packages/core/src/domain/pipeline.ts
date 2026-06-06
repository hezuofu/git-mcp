import type { User } from "../types/platform.js";
import { PaginatedList } from "./paginated-list.js";

export interface PipelineInfo {
  id: string;
  projectId: string;
  sha: string;
  ref: string;
  status: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  webUrl: string;
  duration: number | null;
  user: User | null;
}

export interface PipelineJob {
  id: string;
  name: string;
  stage: string;
  status: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  duration: number | null;
  webUrl: string;
}

export interface JobArtifact {
  filename: string;
  size: number;
  fileType: string;
}

export interface IPipelineCollection {
  list(repository: string, params?: { ref?: string; status?: string; page?: number; perPage?: number }): Promise<PaginatedList<PipelineInfo>>;
  get(repository: string, pipelineId: string): Promise<PipelineInfo>;
  getJobs(repository: string, pipelineId: string): Promise<PipelineJob[]>;
  getJobOutput(repository: string, jobId: string): Promise<string>;
  create(repository: string, params: { ref: string }): Promise<PipelineInfo>;
  retry(repository: string, pipelineId: string): Promise<PipelineInfo>;
  cancel(repository: string, pipelineId: string): Promise<PipelineInfo>;
  playJob(repository: string, jobId: string): Promise<PipelineJob>;
  retryJob(repository: string, jobId: string): Promise<PipelineJob>;
  cancelJob(repository: string, jobId: string): Promise<PipelineJob>;
  listJobArtifacts(repository: string, jobId: string): Promise<JobArtifact[]>;
  listMrPipelines(repository: string, mrIid: number): Promise<PipelineInfo[]>;
}
