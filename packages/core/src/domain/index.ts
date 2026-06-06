export { GitPlatform, PlatformRegistry } from "./git-platform.js";
export { PaginatedList } from "./paginated-list.js";
export { CreatePrBuilder, CreateIssueBuilder } from "./builders.js";
export type { CreatePrParams, CreateIssueParams } from "./builders.js";

// Abstract classes — exported as values so subclasses can extend them
export { PullRequest, ApprovalState } from "./pull-request.js";
export { Issue } from "./issue.js";

// Types and interfaces
export type {
  MergeOptions, MergeResult, PrUpdates, PrFilter,
  GetPrParams, PrNote, PrDiff, DiffSet, IPrMrCollection,
} from "./pull-request.js";
export type {
  IssueUpdates, IssueFilter, GetIssueParams, IssueNote, IIssueCollection,
} from "./issue.js";
export type {
  Repository, SearchReposParams, GetRepoParams, CreateRepoParams,
  ForkRepoParams, BranchInfo, IRepositoryCollection,
} from "./repository.js";
export type {
  FileContent, CreateFileParams, FileUpdateResult,
  FileOperation, CommitResult, IFileCollection,
} from "./file.js";
export type { CreateBranchParams, DeleteBranchParams, IBranchCollection } from "./branch.js";
