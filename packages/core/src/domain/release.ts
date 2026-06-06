import type { User } from "../types/platform.js";
import { PaginatedList } from "./paginated-list.js";

export interface ReleaseInfo {
  id: string;
  tagName: string;
  name: string;
  description: string;
  createdAt: string;
  releasedAt: string;
  author: User;
  assets: ReleaseAsset[];
  rawData: Record<string, unknown>;
}

export interface ReleaseAsset {
  id: string;
  name: string;
  size: number;
  downloadUrl: string;
  contentType: string;
}

export interface CreateReleaseParams {
  repository: string;
  tagName: string;
  name?: string;
  description?: string;
  ref?: string;
}

export interface IReleaseCollection {
  list(repository: string): Promise<PaginatedList<ReleaseInfo>>;
  get(repository: string, tagName: string): Promise<ReleaseInfo>;
  create(params: CreateReleaseParams): Promise<ReleaseInfo>;
  update(repository: string, tagName: string, params: { name?: string; description?: string }): Promise<ReleaseInfo>;
  delete(repository: string, tagName: string): Promise<void>;
}
