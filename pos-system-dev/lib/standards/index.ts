/**
 * Standardization utilities index
 * 
 * This module exports all standardization utilities for easy importing
 */

// API Response utilities
export * from './api-responses';

// Authentication and authorization utilities
export * from './authentication';

// Validation utilities
export * from './validation';

// Error handling utilities - explicit exports to avoid naming conflicts
export {
  ApiError,
  ValidationError as ValidationErrorClass,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  BusinessLogicError,
  DatabaseError,
  ExternalServiceError,
  ErrorCategory,
  handleApiError,
  withErrorHandler,
  createErrorContext,
  logError,
  assertRequired,
  assertRole,
  assertExists,
  setLogger,
  getLogger,
  defaultLogger,
  ERROR_STATUS_CODES,
  type ErrorContext,
  type Logger,
} from './error-handling';