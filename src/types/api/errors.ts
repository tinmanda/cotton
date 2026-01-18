/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Create AppError from unknown error
   */
  static fromUnknown(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError(error.message);
    }

    if (typeof error === "string") {
      return new AppError(error);
    }

    return new AppError("An unknown error occurred");
  }
}

/**
 * Parse-specific error codes
 */
export const PARSE_ERROR_CODES = {
  INVALID_SESSION: 209,
  OBJECT_NOT_FOUND: 101,
  INVALID_CREDENTIALS: 101,
  USERNAME_TAKEN: 202,
  EMAIL_TAKEN: 203,
  CONNECTION_FAILED: 100,
} as const;

/**
 * App-specific error codes
 */
export const APP_ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  AUTH_ERROR: "AUTH_ERROR",
  NOT_FOUND: "NOT_FOUND",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;
