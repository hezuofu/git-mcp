import type { Label } from "../types/platform.js";
import { PaginatedList } from "./paginated-list.js";

export interface ILabelCollection {
  list(repository: string, search?: string): Promise<PaginatedList<Label>>;
  get(repository: string, name: string): Promise<Label>;
  create(repository: string, params: { name: string; color: string; description?: string }): Promise<Label>;
  update(repository: string, name: string, params: { newName?: string; color?: string; description?: string }): Promise<Label>;
  delete(repository: string, name: string): Promise<void>;
}
