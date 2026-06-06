import { DomainError, RateLimitExceededError, AuthenticationError } from "./domain-error.js";

export interface ToolErrorResult {
  code: string;
  message: string;
  suggestion: string;
  recoverable: boolean;
  details?: string;
}

export class ErrorMapper {
  toToolResult(error: DomainError): { error: ToolErrorResult } {
    return {
      error: {
        code: error.code,
        message: error.message,
        suggestion: error.suggestion,
        recoverable: error instanceof RateLimitExceededError
                  || error instanceof AuthenticationError,
        details: error.cause?.message,
      },
    };
  }
}
