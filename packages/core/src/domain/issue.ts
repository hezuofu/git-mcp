import type { User, Label, IssueState } from "../types/platform.js";
import { PaginatedList } from "./paginated-list.js";
import type { CreateIssueParams } from "./builders.js";

export interface IssueUpdates {
  title?: string;
  description?: string;
  state?: IssueState;
  labels?: string[];
  assignees?: string[];
}

export interface IssueFilter {
  repository?: string;
  state?: IssueState;
  labels?: string;
  assignee?: string;
  search?: string;
  page?: number;
  perPage?: number;
}

export interface GetIssueParams {
  repository: string;
  iid: number;
}

export interface IssueNote {
  id: string;
  body: string;
  author: User;
  createdAt: string;
}

export abstract class Issue {
  abstract readonly id: string;
  abstract readonly iid: number;
  abstract readonly title: string;
  abstract readonly description: string;
  abstract state: IssueState;
  abstract readonly createdAt: string;
  abstract readonly updatedAt: string;

  abstract close(): Promise<void>;
  abstract reopen(): Promise<void>;
  abstract update(changes: IssueUpdates): Promise<this>;
  abstract addLabel(label: string): Promise<void>;
  abstract removeLabel(label: string): Promise<void>;
  abstract notes(): Promise<PaginatedList<IssueNote>>;
  abstract createNote(body: string): Promise<IssueNote>;

  abstract get author(): User;
  abstract get assignees(): User[];
  abstract get labels(): Label[];
  abstract get webUrl(): string;
  abstract get repository(): string;
  abstract get rawData(): Record<string, unknown>;
}

export interface IIssueCollection {
  list(filter: IssueFilter): Promise<PaginatedList<Issue>>;
  get(params: GetIssueParams): Promise<Issue>;
  create(params: CreateIssueParams, repository: string): Promise<Issue>;
}
