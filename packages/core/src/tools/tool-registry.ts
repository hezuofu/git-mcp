import { zodToJsonSchema } from "zod-to-json-schema";
import type { ToolDescriptor, ToolContext, ToolProvider } from "./tool-descriptor.js";

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDescriptor>();

  registerPlatform(platform: {
    id: string;
    displayName: string;
    terminology: { pr: string };
    getToolProviders(): ToolProvider[];
  }): void {
    const prefix = platform.id;

    for (const provider of platform.getToolProviders()) {
      for (const descriptor of provider.getTools()) {
        const fullName = `${prefix}_${descriptor.action}`;

        if (this.tools.has(fullName)) {
          throw new Error(`Tool "${fullName}" is already registered`);
        }

        const localizedDesc = descriptor.description
          .replace(/\{term:pr\}/g, platform.terminology.pr);

        this.tools.set(fullName, {
          ...descriptor,
          description: `[${platform.displayName}] ${localizedDesc}`,
        });
      }
    }
  }

  async execute(name: string, args: unknown, context: ToolContext): Promise<unknown> {
    const descriptor = this.tools.get(name);
    if (!descriptor) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return descriptor.execute(args, context);
  }

  toMCPToolList(): MCPTool[] {
    return [...this.tools.entries()].map(([name, desc]) => ({
      name,
      description: desc.description,
      inputSchema: zodToJsonSchema(desc.inputSchema) as Record<string, unknown>,
    }));
  }

  listToolNames(): string[] {
    return [...this.tools.keys()];
  }
}
