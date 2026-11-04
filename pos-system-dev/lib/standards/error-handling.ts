/**
 * Standardized Error Handling Framework
 * 
 * This module provides consistent error classes, handling utilities,
 * and logging for the HARDYPOS system.
 */

import { NextResponse } from 'next/server';
import { createErrorResponse, createValidationErrorResponse, type ApiResponse, type ValidationError as ValidationErrorType } from './api-responses';

// Error categories for classification
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  DATABASE = 'database',
  EXTERNAL_SERVICE = 'external_service',
}

// Error context for logging and debugging
export interface ErrorContext {
  userId?: string;
  locationId?: string;
  businessId?: string;
  endpoint: string;
  method: string;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
  requestId?: string;
  additionalData?: Record<string, any>;
}

// Base API Error class
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly context?: Partial<ErrorContext>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    category: ErrorCategory = ErrorCategory.SYSTEM,
    context?: Partial<ErrorContext>
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.category = category;
    this.context = context;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

// Validation Error class
export class ValidationError extends ApiError {
  public readonly field: string;
  public readonly value?: any;

  constructor(
    message: string,
    field: string,
    value?: any,
    context?: Partial<ErrorContext>
  ) {
    super(message, 400, 'VALIDATION_ERROR', ErrorCategory.VALIDATION, context);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

// Authentication Error class
export class AuthenticationError extends ApiError {
  constructor(
    message: string = 'Authentication required',
    context?: Partial<ErrorContext>
  ) {
    super(message, 401, 'AUTH_ERROR', ErrorCategory.AUTHENTICATION, context);
    this.name = 'AuthenticationError';
  }
}

// Authorization Error class
export class AuthorizationError extends ApiError {
  constructor(
    message: string = 'Insufficient permissions',
    context?: Partial<ErrorContext>
  ) {
    super(message, 403, 'AUTHORIZATION_ERROR', ErrorCategory.AUTHORIZATION, context);
    this.name = 'AuthorizationError';
  }
}

// Not Found Error class
export class NotFoundError extends ApiError {
  public readonly resource: string;

  constructor(
    resource: string = 'Resource',
    context?: Partial<ErrorContext>
  ) {
    const message = `${resource} not found`;
    super(message, 404, 'NOT_FOUND', ErrorCategory.NOT_FOUND, context);
    this.name = 'NotFoundError';
    this.resource = resource;
  }
}

// Business Logic Error class
export class BusinessLogicError extends ApiError {
  constructor(
    message: string,
    context?: Partial<ErrorContext>
  ) {
    super(message, 422, 'BUSINESS_LOGIC_ERROR', ErrorCategory.BUSINESS_LOGIC, context);
    this.name = 'BusinessLogicError';
  }
}

// Database Error class
export class DatabaseError extends ApiError {
  public readonly operation: string;

  constructor(
    message: string,
    operation: string,
    context?: Partial<ErrorContext>
  ) {
    super(message, 500, 'DATABASE_ERROR', ErrorCategory.DATABASE, context);
    this.name = 'DatabaseError';
    this.operation = operation;
  }
}

// External Service Error class
export class ExternalServiceError extends ApiError {
  public readonly service: string;

  constructor(
    message: string,
    service: string,
    statusCode: number = 502,
    context?: Partial<ErrorContext>
  ) {
    super(message, statusCode, 'EXTERNAL_SERVICE_ERROR', ErrorCategory.EXTERNAL_SERVICE, context);
    this.name = 'ExternalServiceError';
    this.service = service;
  }
}

// HTTP status code mapping
export const ERROR_STATUS_CODES: Record<ErrorCategory, number> = {
  [ErrorCategory.VALIDATION]: 400,
  [ErrorCategory.AUTHENTICATION]: 401,
  [ErrorCategory.AUTHORIZATION]: 403,
  [ErrorCategory.NOT_FOUND]: 404,
  [ErrorCategory.BUSINESS_LOGIC]: 422,
  [ErrorCategory.SYSTEM]: 500,
  [ErrorCategory.DATABASE]: 500,
  [ErrorCategory.EXTERNAL_SERVICE]: 502,
};

// Logger interface (can be implemented with different logging libraries)
export interface Logger {
  error(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

// Default console logger implementation
export const defaultLogger: Logger = {
  error: (message: string, meta?: any) => {
    console.error(`[ERROR] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  },
  info: (message: string, meta?: any) => {
    console.info(`[INFO] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  },
  debug: (message: string, meta?: any) => {
    console.debug(`[DEBUG] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  },
};

// Global logger instance (can be replaced with custom logger)
let logger: Logger = defaultLogger;

/**
 * Sets the global logger instance
 * @param newLogger - Logger implementation to use
 */
export function setLogger(newLogger: Logger): void {
  logger = newLogger;
}

/**
 * Gets the current logger instance
 * @returns Current logger
 */
export function getLogger(): Logger {
  return logger;
}

/**
 * Logs an error with proper context and formatting
 * @param error - Error to log
 * @param category - Error category
 * @param context - Additional context
 */
export function logError(
  error: Error,
  category: ErrorCategory,
  context?: Partial<ErrorContext>
): void {
  const timestamp = new Date().toISOString();
  const errorMeta = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    category,
    context: {
      ...context,
      timestamp,
    },
  };

  logger.error(`${category.toUpperCase()}: ${error.message}`, errorMeta);
}

/**
 * Creates error context from request information
 * @param request - Request object
 * @param additionalData - Additional context data
 * @returns Error context
 */
export function createErrorContext(
  request: Request,
  additionalData?: Record<string, any>
): ErrorContext {
  const url = new URL(request.url);
  
  return {
    endpoint: url.pathname,
    method: request.method,
    timestamp: new Date(),
    userAgent: request.headers.get('user-agent') || undefined,
    requestId: request.headers.get('x-request-id') || undefined,
    additionalData,
  };
}

/**
 * Main error handler middleware for API routes
 * @param error - Error that occurred
 * @param context - Error context
 * @returns NextResponse with standardized error format
 */
export function handleApiError(
  error: unknown,
  context?: Partial<ErrorContext>
): NextResponse {
  // Handle known API errors
  if (error instanceof ApiError) {
    logError(error, error.category, { ...context, ...error.context });
    
    const response = createErrorResponse(error.message, error.code);
    return NextResponse.json(response, { status: error.statusCode });
  }

  // Handle validation errors with multiple fields
  if (error instanceof Error && error.name === 'ValidationErrors') {
    const validationErrors = (error as any).errors as ValidationError[];
    logError(error, ErrorCategory.VALIDATION, context);
    
    const response = createValidationErrorResponse(
      validationErrors.map(ve => ({
        field: ve.field,
        message: ve.message,
        value: ve.value,
      }))
    );
    return NextResponse.json(response, { status: 400 });
  }

  // Handle generic errors
  if (error instanceof Error) {
    logError(error, ErrorCategory.SYSTEM, context);
    
    // Don't expose internal error details in production
    const message = process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : error.message;
    
    const response = createErrorResponse(message, 'INTERNAL_ERROR');
    return NextResponse.json(response, { status: 500 });
  }

  // Handle unknown error types
  const unknownError = new Error('An unknown error occurred');
  logError(unknownError, ErrorCategory.SYSTEM, context);
  
  const response = createErrorResponse('An unknown error occurred', 'UNKNOWN_ERROR');
  return NextResponse.json(response, { status: 500 });
}

/**
 * Async error handler wrapper for API route handlers
 * @param handler - API route handler function
 * @returns Wrapped handler with error handling
 */
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      // Extract request from args if available
      const request = args.find(arg => arg instanceof Request) as Request | undefined;
      const context = request ? createErrorContext(request) : undefined;
      
      return handleApiError(error, context);
    }
  };
}

/**
 * Validates that a value is not null or undefined
 * @param value - Value to check
 * @param fieldName - Name of the field for error message
 * @throws ValidationError if value is null or undefined
 */
export function assertRequired<T>(
  value: T | null | undefined,
  fieldName: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new ValidationError(`${fieldName} is required`, fieldName, value);
  }
}

/**
 * Validates that a user has the required role
 * @param userRole - User's current role
 * @param requiredRole - Required role
 * @param context - Error context
 * @throws AuthorizationError if user doesn't have required role
 */
export function assertRole(
  userRole: string,
  requiredRole: string,
  context?: Partial<ErrorContext>
): void {
  if (userRole !== requiredRole) {
    throw new AuthorizationError(
      `Access denied. Required role: ${requiredRole}`,
      context
    );
  }
}

/**
 * Validates that a resource exists
 * @param resource - Resource to check
 * @param resourceName - Name of the resource for error message
 * @param context - Error context
 * @throws NotFoundError if resource doesn't exist
 */
export function assertExists<T>(
  resource: T | null | undefined,
  resourceName: string,
  context?: Partial<ErrorContext>
): asserts resource is T {
  if (!resource) {
    throw new NotFoundError(resourceName, context);
  }
}