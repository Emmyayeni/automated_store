/**
 * Standardized API Response Utilities
 * 
 * This module provides consistent response formats and builder functions
 * for all API endpoints in the HARDYPOS system.
 */

// Base API response interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// Pagination metadata interface
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Paginated response interface
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
}

// Validation error details
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Validation error response interface
export interface ValidationErrorResponse extends ApiResponse {
  validationErrors: ValidationError[];
}

/**
 * Creates a standardized success response
 * @param data - The data to return
 * @returns Standardized success response
 */
export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Creates a standardized error response
 * @param error - Error message
 * @param code - Optional error code
 * @returns Standardized error response
 */
export function createErrorResponse(error: string, code?: string): ApiResponse {
  return {
    success: false,
    error,
    code,
  };
}

/**
 * Creates a standardized paginated response
 * @param data - Array of data items
 * @param pagination - Pagination metadata
 * @returns Standardized paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    pagination,
  };
}

/**
 * Creates a standardized validation error response
 * @param errors - Array of validation errors
 * @param message - Optional general error message
 * @returns Standardized validation error response
 */
export function createValidationErrorResponse(
  errors: ValidationError[],
  message: string = "Validation failed"
): ValidationErrorResponse {
  return {
    success: false,
    error: message,
    code: "VALIDATION_ERROR",
    validationErrors: errors,
  };
}

/**
 * Creates a standardized authentication error response
 * @param message - Optional custom message
 * @returns Standardized auth error response
 */
export function createAuthErrorResponse(
  message: string = "Authentication required"
): ApiResponse {
  return {
    success: false,
    error: message,
    code: "AUTH_ERROR",
  };
}

/**
 * Creates a standardized authorization error response
 * @param message - Optional custom message
 * @returns Standardized authorization error response
 */
export function createAuthorizationErrorResponse(
  message: string = "Insufficient permissions"
): ApiResponse {
  return {
    success: false,
    error: message,
    code: "AUTHORIZATION_ERROR",
  };
}

/**
 * Creates a standardized not found error response
 * @param resource - The resource that was not found
 * @returns Standardized not found error response
 */
export function createNotFoundResponse(resource: string = "Resource"): ApiResponse {
  return {
    success: false,
    error: `${resource} not found`,
    code: "NOT_FOUND",
  };
}

/**
 * Helper function to calculate pagination metadata
 * @param total - Total number of items
 * @param page - Current page number
 * @param limit - Items per page
 * @returns Pagination metadata
 */
export function calculatePagination(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
  };
}

/**
 * Type guard to check if response is successful
 * @param response - API response to check
 * @returns True if response is successful
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { success: true; data: T } {
  return response.success === true;
}

/**
 * Type guard to check if response is an error
 * @param response - API response to check
 * @returns True if response is an error
 */
export function isErrorResponse(response: ApiResponse): response is ApiResponse & { success: false; error: string } {
  return response.success === false;
}