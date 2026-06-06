import type { PageInfo } from "../types/platform.js";

export abstract class PaginatedList<T> implements AsyncIterable<T> {
  abstract readonly totalCount: number | null;
  abstract readonly items: T[];
  abstract readonly pageInfo: PageInfo;

  abstract nextPage(): Promise<PaginatedList<T> | null>;
  abstract hasMore(): boolean;

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    let page: PaginatedList<T> | null = this;
    while (page) {
      for (const item of page.items) yield item;
      page = await page.nextPage();
    }
  }
}
