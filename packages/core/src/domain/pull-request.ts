import type { User, Label, PrState } from "../types/platform.js";
import { PaginatedList } from "./paginated-list.js";
import type { CreatePrParams } from "./builders.js";

export interface MergeOptions {
  method?: "merge" | "squash" | "rebase";
  title?: string;
  deleteSourceBranch?: boolean;
}

export interface MergeResult {
  sha: string;
  merged: boolean;
  message: string;
}

export interface PrUpdates {
  title?: string;
  description?: string;
  state?: PrState;
  targetBranch?: string;
  labels?: string[];
}

export interface PrFilter {
  repository?: string;
  state?: PrState;
  author?: string;
  assignee?: string;
  labels?: string;
  search?: string;
  page?: number;
  perPage?: number;
}

export interface GetPrParams {
  repository: string;
  iid: number;
}

export interface PrNote {
  id: string;
  body: string;
  author: User;
  createdAt: string;
}

export interface PrDiff {
  oldPath: string;
  newPath: string;
  diff: string;
  newFile: boolean;
  deletedFile: boolean;
  renamedFile: boolean;
  additions: number;
  deletions: number;
}

export interface DiffSet {
  files: PrDiff[];
  stats: { additions: number; deletions: number; changedFiles: number };
}

export abstract class PullRequest {
  abstract readonly id: string;
  abstract readonly iid: number;
  abstract readonly title: string;
  abstract readonly description: string;
  abstract state: PrState;
  abstract readonly sourceBranch: string;
  abstract readonly targetBranch: string;
  abstract readonly createdAt: string;
  abstract readonly updatedAt: string;

  abstract merge(options?: MergeOptions): Promise<MergeResult>;
  abstract close(): Promise<void>;
  abstract reopen(): Promise<void>;
  abstract update(changes: PrUpdates): Promise<this>;
  abstract notes(): Promise<PaginatedList<PrNote>>;
  abstract diffs(): Promise<DiffSet>;
  abstract approvalState(): Promise<unknown>;

  abstract get author(): User;
  abstract get assignees(): User[];
  abstract get labels(): Label[];
  abstract get webUrl(): string;
  abstract get repository(): string;
  abstract get rawData(): Record<string, unknown>;
}

export abstract class ApprovalState {
  abstract readonly approved: boolean;
  abstract readonly approvedBy: User[];
  abstract readonly requiredCount: number;
  abstract readonly currentCount: number;
}

export interface IPrMrCollection {
  list(filter: PrFilter): Promise<PaginatedList<PullRequest>>;
  get(params: GetPrParams): Promise<PullRequest>;
  create(params: CreatePrParams, repository: string): Promise<PullRequest>;
}
