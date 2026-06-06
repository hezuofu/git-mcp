export type PlatformId = "github" | "gitlab" | "gitee" | "gitcode";

export type PrState = "open" | "closed" | "merged";

export type IssueState = "open" | "closed";

export interface PageInfo {
  currentPage: number;
  perPage: number;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string | null;
  avatarUrl: string;
  platform: PlatformId;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  description: string | null;
}
