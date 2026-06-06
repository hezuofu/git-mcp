import type { PlatformId } from "../types/platform.js";
import { PaginatedList } from "./paginated-list.js";

export interface SearchReposParams {
  search?: string;
  page?: number;
  perPage?: number;
}

export interface GetRepoParams {
  path: string;
}

export interface CreateRepoParams {
  name: string;
  description?: string;
  visibility?: "private" | "public";
}

export interface ForkRepoParams {
  path: string;
  targetNamespace?: string;
}

export interface BranchInfo {
  name: string;
  sha: string;
  protected: boolean;
}

export interface Repository {
  id: string;
  name: string;
  fullPath: string;
  description: string;
  defaultBranch: string;
  visibility: "private" | "public" | "internal";
  webUrl: string;
  cloneUrl: string;
  platform: PlatformId;
  rawData: Record<string, unknown>;
}

export interface IRepositoryCollection {
  search(criteria: SearchReposParams): Promise<PaginatedList<Repository>>;
  get(params: GetRepoParams): Promise<Repository>;
  create(params: CreateRepoParams): Promise<Repository>;
  fork(params: ForkRepoParams): Promise<Repository>;
  listBranches(repoPath: string): Promise<PaginatedList<BranchInfo>>;
}
