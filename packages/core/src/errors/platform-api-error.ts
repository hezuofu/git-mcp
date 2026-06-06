import { DomainError } from "./domain-error.js";

export abstract class PlatformApiError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly body: unknown = null,
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  abstract map(): DomainError;
}
