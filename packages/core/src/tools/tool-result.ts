export class ToolResult {
  static single(data: unknown): string {
    return JSON.stringify(data, null, 2);
  }

  static paginated(list: { items: unknown[]; totalCount?: number | null; pageInfo?: unknown }): string {
    return JSON.stringify({
      items: list.items,
      totalCount: list.totalCount ?? null,
      pageInfo: list.pageInfo ?? null,
    }, null, 2);
  }

  static list(items: unknown[]): string {
    return JSON.stringify(items, null, 2);
  }

  static error(error: { code: string; message: string; suggestion?: string; recoverable?: boolean }): string {
    return JSON.stringify({ error }, null, 2);
  }
}
