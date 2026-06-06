import { PaginatedList } from "./paginated-list.js";

export interface CodeSearchResult {
  path: string;
  basename: string;
  data: string;
  startline: number;
  ref: string;
  projectId: string;
}

export interface SearchCodeParams {
  repository?: string;
  group?: string;
  search: string;
  page?: number;
  perPage?: number;
}

export interface ISearchCollection {
  searchCode(params: SearchCodeParams): Promise<PaginatedList<CodeSearchResult>>;
}
