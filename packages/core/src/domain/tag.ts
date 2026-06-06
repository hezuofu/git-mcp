import { PaginatedList } from "./paginated-list.js";

export interface TagInfo {
  name: string;
  message: string;
  commitSha: string;
  createdAt: string;
}

export interface CreateTagParams {
  repository: string;
  name: string;
  ref: string;
  message?: string;
}

export interface ITagCollection {
  list(repository: string, search?: string): Promise<PaginatedList<TagInfo>>;
  get(repository: string, name: string): Promise<TagInfo>;
  create(params: CreateTagParams): Promise<TagInfo>;
  delete(repository: string, name: string): Promise<void>;
}
