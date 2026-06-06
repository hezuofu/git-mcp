import type { User } from "../types/platform.js";
import { PaginatedList } from "./paginated-list.js";

export interface DraftNote {
  id: string;
  body: string;
  author: User;
  createdAt: string;
}

export interface CreateDraftNoteParams {
  repository: string;
  mrIid: number;
  body: string;
  position?: {
    baseSha: string; startSha: string; headSha: string;
    newPath: string; oldPath: string;
    newLine?: number; oldLine?: number;
  };
}

export interface IDraftNoteCollection {
  list(repository: string, mrIid: number): Promise<PaginatedList<DraftNote>>;
  get(repository: string, mrIid: number, draftId: string): Promise<DraftNote>;
  create(params: CreateDraftNoteParams): Promise<DraftNote>;
  update(repository: string, mrIid: number, draftId: string, body: string): Promise<DraftNote>;
  delete(repository: string, mrIid: number, draftId: string): Promise<void>;
  publish(repository: string, mrIid: number, draftId: string): Promise<void>;
  publishAll(repository: string, mrIid: number): Promise<void>;
}
