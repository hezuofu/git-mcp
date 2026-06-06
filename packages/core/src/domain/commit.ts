import type { User } from "../types/platform.js";
import { PaginatedList } from "./paginated-list.js";

export interface CommitInfo {
  sha: string;
  message: string;
  author: User;
  authoredDate: string;
  committedDate: string;
  parentShas: string[];
  webUrl: string;
}

export interface CommitDiff {
  oldPath: string;
  newPath: string;
  diff: string;
  newFile: boolean;
  deletedFile: boolean;
  renamedFile: boolean;
}

export interface CommitStatus {
  sha: string;
  state: "pending" | "running" | "success" | "failed" | "canceled";
  context: string;
  description: string;
  targetUrl: string | null;
}

export interface ListCommitsParams {
  repository: string;
  ref?: string;
  path?: string;
  since?: string;
  until?: string;
  page?: number;
  perPage?: number;
}

export interface CreateCommitStatusParams {
  repository: string;
  sha: string;
  state: CommitStatus["state"];
  context?: string;
  description?: string;
  targetUrl?: string;
}

export interface ICommitCollection {
  list(params: ListCommitsParams): Promise<PaginatedList<CommitInfo>>;
  get(repository: string, sha: string): Promise<CommitInfo>;
  getDiff(repository: string, sha: string): Promise<CommitDiff[]>;
  getFileBlame(repository: string, path: string, ref?: string, range?: { start: number; end: number }): Promise<BlameEntry[]>;
  listStatuses(repository: string, sha: string): Promise<CommitStatus[]>;
  createStatus(params: CreateCommitStatusParams): Promise<CommitStatus>;
}

export interface BlameEntry {
  startLine: number;
  endLine: number;
  commit: { sha: string; message: string; author: User; authoredDate: string };
}
