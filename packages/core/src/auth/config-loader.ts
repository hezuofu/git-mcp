import type { GitMcpConfig } from "../types/config.js";
import type { AuthStrategy, ActivePlatform } from "./auth-strategy.js";
import type { GitPlatform } from "../domain/git-platform.js";

export class ConfigLoader {
  private readonly strategies: Map<string, AuthStrategy>;

  constructor(strategies: AuthStrategy[]) {
    this.strategies = new Map(strategies.map(s => [s.handlesType, s]));
  }

  parse(raw: string): GitMcpConfig {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      throw new Error(`Failed to parse GIT_MCP_CONFIG: ${(e as Error).message}`);
    }

    const config = parsed as Record<string, unknown>;
    if (!config || !Array.isArray(config.platforms)) {
      throw new Error("GIT_MCP_CONFIG must contain a 'platforms' array");
    }

    return config as unknown as GitMcpConfig;
  }

  async activate(
    config: GitMcpConfig,
    registry: { get(id: string): GitPlatform | undefined },
  ): Promise<ActivePlatform[]> {
    const active: ActivePlatform[] = [];

    for (const entry of config.platforms) {
      const platform = registry.get(entry.platform);
      if (!platform) {
        console.warn(`Unknown platform "${entry.platform}", skipping`);
        continue;
      }

      const strategy = this.strategies.get(entry.auth.type);
      if (!strategy) {
        console.warn(`No strategy for auth type "${entry.auth.type}" on "${entry.platform}", skipping`);
        continue;
      }

      try {
        const session = await strategy.authenticate(entry.auth, platform);
        active.push({ platform, session, apiUrl: entry.apiUrl });
      } catch (err) {
        console.error(`Auth failed for ${entry.platform}: ${(err as Error).message}`);
      }
    }

    return active;
  }
}
