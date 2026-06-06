import type { User } from "../types/platform.js";
import { PaginatedList } from "./paginated-list.js";

export interface IssueLink {
  id: string;
  sourceIssueIid: number;
  targetIssueIid: number;
  targetProjectId: string;
  linkType: string;
  targetIssue: { iid: number; title: string; webUrl: string; state: string };
}

export interface IIssueLinkCollection {
  list(repository: string, issueIid: number): Promise<PaginatedList<IssueLink>>;
  get(repository: string, issueIid: number, linkId: string): Promise<IssueLink>;
  create(repository: string, issueIid: number, params: { targetProjectId: string; targetIssueIid: number; linkType?: string }): Promise<IssueLink>;
  delete(repository: string, issueIid: number, linkId: string): Promise<void>;
}
