import type { User } from "../types/platform.js";
import { PaginatedList } from "./paginated-list.js";

export interface EmojiReaction {
  id: string;
  name: string; // e.g. "thumbsup", "rocket", "eyes"
  user: User;
  createdAt: string;
}

export interface IReactionCollection {
  // MR/PR reactions
  listMrReactions(repository: string, mrIid: number): Promise<PaginatedList<EmojiReaction>>;
  createMrReaction(repository: string, mrIid: number, name: string): Promise<EmojiReaction>;
  deleteMrReaction(repository: string, mrIid: number, reactionId: string): Promise<void>;

  // MR note reactions
  listMrNoteReactions(repository: string, mrIid: number, noteId: string): Promise<PaginatedList<EmojiReaction>>;
  createMrNoteReaction(repository: string, mrIid: number, noteId: string, name: string): Promise<EmojiReaction>;
  deleteMrNoteReaction(repository: string, mrIid: number, noteId: string, reactionId: string): Promise<void>;

  // Issue reactions
  listIssueReactions(repository: string, issueIid: number): Promise<PaginatedList<EmojiReaction>>;
  createIssueReaction(repository: string, issueIid: number, name: string): Promise<EmojiReaction>;
  deleteIssueReaction(repository: string, issueIid: number, reactionId: string): Promise<void>;

  // Issue note reactions
  listIssueNoteReactions(repository: string, issueIid: number, noteId: string): Promise<PaginatedList<EmojiReaction>>;
  createIssueNoteReaction(repository: string, issueIid: number, noteId: string, name: string): Promise<EmojiReaction>;
  deleteIssueNoteReaction(repository: string, issueIid: number, noteId: string, reactionId: string): Promise<void>;
}
