import { PaginatedList } from "./paginated-list.js";
import type { BranchInfo } from "./repository.js";

export interface CreateBranchParams {
  repository: string;
  name: string;
  ref: string;
}

export interface DeleteBranchParams {
  repository: string;
  name: string;
}

export interface IBranchCollection {
  list(repository: string, search?: string): Promise<PaginatedList<BranchInfo>>;
  get(repository: string, name: string): Promise<BranchInfo>;
  create(params: CreateBranchParams): Promise<BranchInfo>;
  delete(params: DeleteBranchParams): Promise<void>;
}
