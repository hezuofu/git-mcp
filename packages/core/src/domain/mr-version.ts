import { PaginatedList } from "./paginated-list.js";

export interface MrVersion {
  id: string;
  headCommitSha: string;
  baseCommitSha: string;
  startCommitSha: string;
  createdAt: string;
}

export interface IMrVersionCollection {
  list(repository: string, mrIid: number): Promise<PaginatedList<MrVersion>>;
  get(repository: string, mrIid: number, versionId: string): Promise<MrVersion>;
}
