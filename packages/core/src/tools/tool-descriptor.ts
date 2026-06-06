import type { z } from "zod";

export interface ToolContext {
  platform: { id: string; displayName?: string };
  session: unknown;
}

export interface ToolDescriptor<TInput = unknown> {
  readonly action: string;
  readonly description: string;
  readonly inputSchema: z.ZodType<TInput>;
  execute(input: TInput, context: ToolContext): Promise<unknown>;
}

export interface ToolProvider {
  getTools(): ToolDescriptor[];
}
