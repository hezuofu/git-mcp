import type { AuthEntry } from "../types/auth.js";
import type { GitPlatform } from "../domain/git-platform.js";

export interface ActivePlatform {
  platform: GitPlatform;
  session: {
    platform: string;
    sign(headers: Record<string, string>): void;
    refresh(): Promise<unknown>;
    user: unknown;
    createdAt: Date;
    expiresAt: Date | null;
    canRefresh: boolean;
  };
  apiUrl?: string;
}

export interface AuthStrategy {
  readonly handlesType: string;
  authenticate(auth: AuthEntry, platform: GitPlatform): Promise<ActivePlatform["session"]>;
}
