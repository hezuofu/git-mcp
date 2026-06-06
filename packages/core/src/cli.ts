#!/usr/bin/env node
import { ToolRegistry } from "./tools/tool-registry.js";
import { PlatformRegistry } from "./domain/git-platform.js";
import { ConfigLoader, OAuthPKCEStrategy } from "./auth/index.js";
import { createMcpServer } from "./transport/mcp-server.js";
import type { AuthEntry } from "./types/auth.js";
import type { AuthStrategy, ActivePlatform } from "./auth/auth-strategy.js";
import type { GitPlatform } from "./domain/git-platform.js";

export async function main() {
  const configRaw = process.env["GIT_MCP_CONFIG"];
  if (!configRaw) {
    console.error("GIT_MCP_CONFIG environment variable is required");
    console.error('Example: GIT_MCP_CONFIG=\'{"platforms":[{"platform":"github","auth":{"type":"pat","token":"ghp_xxx"}}]}\'');
    process.exit(1);
  }

  // 1. Load config
  const patStrategy: AuthStrategy = {
    handlesType: "pat",
    async authenticate(auth: AuthEntry, platform: GitPlatform): Promise<ActivePlatform["session"]> {
      const token = (auth as { token: string }).token;
      const session = platform.createSession(token);
      try {
        (session as any).user = await platform.validateToken(token);
      } catch { /* user resolution failed, session still valid */ }
      return session as unknown as ActivePlatform["session"];
    },
  };

  const configLoader = new ConfigLoader([patStrategy, new OAuthPKCEStrategy()]);
  const config = configLoader.parse(configRaw);

  // 2. Load platform adapters
  const platformRegistry = new PlatformRegistry();
  await loadAdapters(platformRegistry);

  // 3. Activate platforms (authenticate)
  const activePlatforms = await configLoader.activate(config, platformRegistry);

  if (activePlatforms.length === 0) {
    console.error("No platforms could be activated. Check your GIT_MCP_CONFIG.");
    process.exit(1);
  }

  // 4. Register tools
  const toolRegistry = new ToolRegistry();
  for (const { platform, session, apiUrl } of activePlatforms) {
    (platform as any).registerSession(session, apiUrl);
    toolRegistry.registerPlatform(platform as any);
  }

  console.error(`Active platforms: ${activePlatforms.map(p => p.platform.id).join(", ")}`);
  console.error(`Tools available: ${toolRegistry.listToolNames().length}`);

  // 5. Start MCP server
  const transport = process.env["GIT_MCP_TRANSPORT"] === "sse" ? "sse"
    : process.env["GIT_MCP_TRANSPORT"] === "streamable-http" ? "streamable-http"
    : "stdio";

  await createMcpServer(toolRegistry, { transport });
}

async function loadAdapters(registry: PlatformRegistry): Promise<void> {
  const adapters: Array<{ name: string; exportName: string }> = [
    { name: "@git-mcp/adapter-github", exportName: "GitHubPlatform" },
    { name: "@git-mcp/adapter-gitlab", exportName: "GitLabPlatform" },
    { name: "@git-mcp/adapter-gitee", exportName: "GiteePlatform" },
    { name: "@git-mcp/adapter-gitcode", exportName: "GitCodePlatform" },
  ];

  for (const { name, exportName } of adapters) {
    try {
      const mod = await import(name);
      const PlatformClass = mod[exportName];
      if (PlatformClass && typeof PlatformClass === "function") {
        registry.register(new PlatformClass());
        console.error(`Loaded adapter: ${name}`);
      }
    } catch (e) {
      // Adapter not installed — skip
    }
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
