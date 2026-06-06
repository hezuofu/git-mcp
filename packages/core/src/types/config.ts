import type { PlatformId } from "./platform.js";
import type { AuthEntry } from "./auth.js";

export interface PlatformEntry {
  platform: PlatformId;
  auth: AuthEntry;
  apiUrl?: string;
}

export interface GitMcpConfig {
  platforms: PlatformEntry[];
}
