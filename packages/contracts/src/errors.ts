// Error contract types

export interface ErrorResponse {
  error: string;
  message: string;
  requestId?: string;
}

export interface ValidationErrorResponse extends ErrorResponse {
  error: "validation_error";
  fields?: Record<string, string[]>;
}

export const ERROR_CODES = {
  NOT_FOUND: "not_found",
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  VALIDATION_ERROR: "validation_error",
  INTERNAL_ERROR: "internal_error",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
