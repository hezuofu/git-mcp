import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ToolRegistry } from "../tools/tool-registry.js";

export type TransportMode = "stdio" | "sse" | "streamable-http";

export interface ServerOptions {
  transport: TransportMode;
  host?: string;
  port?: number;
}

export async function createMcpServer(
  toolRegistry: ToolRegistry,
  options: ServerOptions = { transport: "stdio" },
): Promise<void> {
  const server = new McpServer({
    name: "git-mcp",
    version: "0.1.0",
  }, {
    capabilities: { tools: {} },
  });

  const tools = toolRegistry.toMCPToolList();
  for (const tool of tools) {
    server.tool(
      tool.name,
      tool.description,
      tool.inputSchema as Record<string, unknown>,
      async (args: unknown) => {
        const result = await toolRegistry.execute(tool.name, args, {
          platform: { id: tool.name.split("_")[0] },
          session: {},
        });
        return {
          content: [{ type: "text" as const, text: typeof result === "string" ? result : JSON.stringify(result, null, 2) }],
        };
      },
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
