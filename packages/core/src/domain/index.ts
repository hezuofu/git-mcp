export { GitPlatform, PlatformRegistry } from "./git-platform.js";
export { PaginatedList } from "./paginated-list.js";
export { CreatePrBuilder, CreateIssueBuilder } from "./builders.js";
export type { CreatePrParams, CreateIssueParams } from "./builders.js";

// Abstract classes — exported as values so subclasses can extend them
export { PullRequest, ApprovalState } from "./pull-request.js";
export { Issue } from "./issue.js";

// Types and interfaces — PR/MR, Issue
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

// Labels
export type { ILabelCollection } from "./label.js";

// Tags
export type { TagInfo, CreateTagParams, ITagCollection } from "./tag.js";

// Releases
export type { ReleaseInfo, ReleaseAsset, CreateReleaseParams, IReleaseCollection } from "./release.js";

// Commits
export type {
  CommitInfo, CommitDiff, CommitStatus, ListCommitsParams,
  CreateCommitStatusParams, ICommitCollection, BlameEntry,
} from "./commit.js";

// Search
export type { CodeSearchResult, SearchCodeParams, ISearchCollection } from "./search.js";

// Pipelines
export type {
  PipelineInfo, PipelineJob, JobArtifact, IPipelineCollection,
} from "./pipeline.js";

// Issue links
export type { IssueLink, IIssueLinkCollection } from "./issue-link.js";

// Todos
export type { TodoItem, ITodoCollection } from "./todo.js";

// Draft notes
export type { DraftNote, CreateDraftNoteParams, IDraftNoteCollection } from "./draft-note.js";

// Emoji reactions
export type { EmojiReaction, IReactionCollection } from "./reaction.js";

// MR versions
export type { MrVersion, IMrVersionCollection } from "./mr-version.js";
