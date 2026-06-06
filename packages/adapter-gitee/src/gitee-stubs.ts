import { UnsupportedOperationError } from "@git-mcp/core";
import type { IIssueLinkCollection, ITodoCollection, IReactionCollection, IDraftNoteCollection, IMrVersionCollection, IPipelineCollection, PaginatedList, IssueLink, TodoItem, EmojiReaction, DraftNote, MrVersion, PipelineInfo, PipelineJob, JobArtifact } from "@git-mcp/core";

const PLATFORM = "gitee";

function emptyList<T>(): PaginatedList<T> {
  return { items: [], totalCount: 0, pageInfo: { currentPage: 1, perPage: 20 }, nextPage: async () => null, hasMore: () => false, [Symbol.asyncIterator]() { return [][Symbol.iterator]() as any; } } as any;
}

// Gitee does NOT have: issue links, draft notes, emoji reactions, MR versions, pipelines
// These collections throw UnsupportedOperationError to clearly signal platform limitation

export class GiteeIssueLinkCollection implements IIssueLinkCollection {
  async list(): Promise<PaginatedList<IssueLink>> { return emptyList(); }
  async get(): Promise<IssueLink> { throw new UnsupportedOperationError("issue_links", PLATFORM); }
  async create(): Promise<IssueLink> { throw new UnsupportedOperationError("issue_links", PLATFORM); }
  async delete(): Promise<void> { throw new UnsupportedOperationError("issue_links", PLATFORM); }
}

export class GiteeTodoCollection implements ITodoCollection {
  async list(): Promise<PaginatedList<TodoItem>> { return emptyList(); }
  async markDone(): Promise<void> { throw new UnsupportedOperationError("todos", PLATFORM); }
  async markAllDone(): Promise<void> { throw new UnsupportedOperationError("todos", PLATFORM); }
}

export class GiteeDraftNoteCollection implements IDraftNoteCollection {
  async list(): Promise<PaginatedList<DraftNote>> { return emptyList(); }
  async get(): Promise<DraftNote> { throw new UnsupportedOperationError("draft_notes", PLATFORM); }
  async create(): Promise<DraftNote> { throw new UnsupportedOperationError("draft_notes", PLATFORM); }
  async update(): Promise<DraftNote> { throw new UnsupportedOperationError("draft_notes", PLATFORM); }
  async delete(): Promise<void> { throw new UnsupportedOperationError("draft_notes", PLATFORM); }
  async publish(): Promise<void> { throw new UnsupportedOperationError("draft_notes", PLATFORM); }
  async publishAll(): Promise<void> { throw new UnsupportedOperationError("draft_notes", PLATFORM); }
}

export class GiteeReactionCollection implements IReactionCollection {
  async listMrReactions(): Promise<PaginatedList<EmojiReaction>> { return emptyList(); }
  async createMrReaction(): Promise<EmojiReaction> { throw new UnsupportedOperationError("emoji_reactions", PLATFORM); }
  async deleteMrReaction(): Promise<void> { throw new UnsupportedOperationError("emoji_reactions", PLATFORM); }
  async listMrNoteReactions(): Promise<PaginatedList<EmojiReaction>> { return emptyList(); }
  async createMrNoteReaction(): Promise<EmojiReaction> { throw new UnsupportedOperationError("emoji_reactions", PLATFORM); }
  async deleteMrNoteReaction(): Promise<void> { throw new UnsupportedOperationError("emoji_reactions", PLATFORM); }
  async listIssueReactions(): Promise<PaginatedList<EmojiReaction>> { return emptyList(); }
  async createIssueReaction(): Promise<EmojiReaction> { throw new UnsupportedOperationError("emoji_reactions", PLATFORM); }
  async deleteIssueReaction(): Promise<void> { throw new UnsupportedOperationError("emoji_reactions", PLATFORM); }
  async listIssueNoteReactions(): Promise<PaginatedList<EmojiReaction>> { return emptyList(); }
  async createIssueNoteReaction(): Promise<EmojiReaction> { throw new UnsupportedOperationError("emoji_reactions", PLATFORM); }
  async deleteIssueNoteReaction(): Promise<void> { throw new UnsupportedOperationError("emoji_reactions", PLATFORM); }
}

export class GiteeMrVersionCollection implements IMrVersionCollection {
  async list(): Promise<PaginatedList<MrVersion>> { return emptyList(); }
  async get(): Promise<MrVersion> { throw new UnsupportedOperationError("mr_versions", PLATFORM); }
}

export class GiteePipelineCollection implements IPipelineCollection {
  async list(): Promise<PaginatedList<PipelineInfo>> { return emptyList(); }
  async get(): Promise<PipelineInfo> { throw new UnsupportedOperationError("pipelines", PLATFORM); }
  async getJobs(): Promise<PipelineJob[]> { throw new UnsupportedOperationError("pipelines", PLATFORM); return []; }
  async getJobOutput(): Promise<string> { throw new UnsupportedOperationError("pipelines", PLATFORM); return ""; }
  async create(): Promise<PipelineInfo> { throw new UnsupportedOperationError("pipelines", PLATFORM); return {} as any; }
  async retry(): Promise<PipelineInfo> { throw new UnsupportedOperationError("pipelines", PLATFORM); return {} as any; }
  async cancel(): Promise<PipelineInfo> { throw new UnsupportedOperationError("pipelines", PLATFORM); return {} as any; }
  async playJob(): Promise<PipelineJob> { throw new UnsupportedOperationError("pipelines", PLATFORM); return {} as any; }
  async retryJob(): Promise<PipelineJob> { throw new UnsupportedOperationError("pipelines", PLATFORM); return {} as any; }
  async cancelJob(): Promise<PipelineJob> { throw new UnsupportedOperationError("pipelines", PLATFORM); return {} as any; }
  async listJobArtifacts(): Promise<JobArtifact[]> { throw new UnsupportedOperationError("pipelines", PLATFORM); return []; }
  async listMrPipelines(): Promise<PipelineInfo[]> { throw new UnsupportedOperationError("pipelines", PLATFORM); return []; }
}
