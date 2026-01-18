import Parse from "parse/react-native.js";
import {
  ApiResponse,
  PaginatedResponse,
  errorResponseFromUnknown,
  successResponse,
} from "@/types";

/**
 * Base Parse service with common query helpers
 * Extend this for specific models
 */
export class ParseService {
  /**
   * Execute a Parse query with error handling
   */
  static async executeQuery<T>(
    query: Parse.Query,
    transform: (obj: Parse.Object) => T
  ): Promise<ApiResponse<T[]>> {
    try {
      const results = await query.find();
      const data = results.map(transform);
      return successResponse(data);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Execute a paginated Parse query
   */
  static async executePaginatedQuery<T>(
    query: Parse.Query,
    transform: (obj: Parse.Object) => T,
    page: number = 1,
    pageSize: number = 20
  ): Promise<ApiResponse<PaginatedResponse<T>>> {
    try {
      const skip = (page - 1) * pageSize;

      const countQuery = new Parse.Query(query.className);
      const totalCount = await countQuery.count();

      query.skip(skip);
      query.limit(pageSize);

      const results = await query.find();
      const items = results.map(transform);

      const totalPages = Math.ceil(totalCount / pageSize);

      return successResponse({
        items,
        meta: {
          currentPage: page,
          pageSize,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      });
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Get object by ID
   */
  static async getById<T>(
    className: string,
    id: string,
    transform: (obj: Parse.Object) => T
  ): Promise<ApiResponse<T>> {
    try {
      const query = new Parse.Query(className);
      const result = await query.get(id);
      const data = transform(result);
      return successResponse(data);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Save Parse object with error handling
   */
  static async save<T>(
    obj: Parse.Object,
    transform: (obj: Parse.Object) => T
  ): Promise<ApiResponse<T>> {
    try {
      const result = await obj.save();
      const data = transform(result);
      return successResponse(data);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Delete Parse object
   */
  static async delete(obj: Parse.Object): Promise<ApiResponse<void>> {
    try {
      await obj.destroy();
      return successResponse(undefined);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }
}
