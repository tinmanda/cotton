import { AppError } from "./errors";

/**
 * Standard API response type using discriminated unions
 * This ensures type safety when handling success/error cases
 */
export type ApiResponse<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: AppError;
    };

/**
 * Helper to create success response
 */
export const successResponse = <T>(data: T): ApiResponse<T> => ({
  success: true,
  data,
});

/**
 * Helper to create error response
 */
export const errorResponse = <T>(error: AppError): ApiResponse<T> => ({
  success: false,
  error,
});

/**
 * Helper to create error response from unknown error
 */
export const errorResponseFromUnknown = <T>(
  error: unknown
): ApiResponse<T> => ({
  success: false,
  error: AppError.fromUnknown(error),
});

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Paginated response type
 */
export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}
