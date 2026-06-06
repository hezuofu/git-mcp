import type { User } from "../types/platform.js";
import { PaginatedList } from "./paginated-list.js";

export interface TodoItem {
  id: string;
  targetType: string; // "Issue", "MergeRequest", etc.
  targetUrl: string;
  body: string;
  state: "pending" | "done";
  author: User;
  createdAt: string;
}

export interface ITodoCollection {
  list(params?: { state?: string; type?: string; page?: number; perPage?: number }): Promise<PaginatedList<TodoItem>>;
  markDone(todoId: string): Promise<void>;
  markAllDone(): Promise<void>;
}
