/**
 * Unit tests for API response standardization utilities
 */

import {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  createValidationErrorResponse,
  createAuthErrorResponse,
  createAuthorizationErrorResponse,
  createNotFoundResponse,
  calculatePagination,
  isSuccessResponse,
  isErrorResponse,
  type ApiResponse,
  type PaginationMeta,
  type ValidationError,
} from '../api-responses';

describe('API Response Utilities', () => {
  describe('createSuccessResponse', () => {
    it('should create a success response with data', () => {
      const data = { id: 1, name: 'Test Product' };
      const response = createSuccessResponse(data);

      expect(response).toEqual({
        success: true,
        data,
      });
    });

    it('should handle null data', () => {
      const response = createSuccessResponse(null);

      expect(response).toEqual({
        success: true,
        data: null,
      });
    });

    it('should handle array data', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const response = createSuccessResponse(data);

      expect(response).toEqual({
        success: true,
        data,
      });
    });
  });

  describe('createErrorResponse', () => {
    it('should create an error response with message', () => {
      const error = 'Something went wrong';
      const response = createErrorResponse(error);

      expect(response).toEqual({
        success: false,
        error,
      });
    });

    it('should create an error response with message and code', () => {
      const error = 'Invalid input';
      const code = 'INVALID_INPUT';
      const response = createErrorResponse(error, code);

      expect(response).toEqual({
        success: false,
        error,
        code,
      });
    });
  });

  describe('createPaginatedResponse', () => {
    it('should create a paginated response', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const pagination: PaginationMeta = {
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
      };

      const response = createPaginatedResponse(data, pagination);

      expect(response).toEqual({
        success: true,
        data,
        pagination,
      });
    });

    it('should handle empty data array', () => {
      const data: any[] = [];
      const pagination: PaginationMeta = {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      };

      const response = createPaginatedResponse(data, pagination);

      expect(response).toEqual({
        success: true,
        data: [],
        pagination,
      });
    });
  });

  describe('createValidationErrorResponse', () => {
    it('should create a validation error response', () => {
      const errors: ValidationError[] = [
        { field: 'email', message: 'Email is required' },
        { field: 'password', message: 'Password must be at least 8 characters' },
      ];

      const response = createValidationErrorResponse(errors);

      expect(response).toEqual({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        validationErrors: errors,
      });
    });

    it('should create a validation error response with custom message', () => {
      const errors: ValidationError[] = [
        { field: 'name', message: 'Name is required' },
      ];
      const customMessage = 'Product validation failed';

      const response = createValidationErrorResponse(errors, customMessage);

      expect(response).toEqual({
        success: false,
        error: customMessage,
        code: 'VALIDATION_ERROR',
        validationErrors: errors,
      });
    });
  });

  describe('createAuthErrorResponse', () => {
    it('should create an auth error response with default message', () => {
      const response = createAuthErrorResponse();

      expect(response).toEqual({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_ERROR',
      });
    });

    it('should create an auth error response with custom message', () => {
      const customMessage = 'Invalid credentials';
      const response = createAuthErrorResponse(customMessage);

      expect(response).toEqual({
        success: false,
        error: customMessage,
        code: 'AUTH_ERROR',
      });
    });
  });

  describe('createAuthorizationErrorResponse', () => {
    it('should create an authorization error response with default message', () => {
      const response = createAuthorizationErrorResponse();

      expect(response).toEqual({
        success: false,
        error: 'Insufficient permissions',
        code: 'AUTHORIZATION_ERROR',
      });
    });

    it('should create an authorization error response with custom message', () => {
      const customMessage = 'Admin access required';
      const response = createAuthorizationErrorResponse(customMessage);

      expect(response).toEqual({
        success: false,
        error: customMessage,
        code: 'AUTHORIZATION_ERROR',
      });
    });
  });

  describe('createNotFoundResponse', () => {
    it('should create a not found response with default message', () => {
      const response = createNotFoundResponse();

      expect(response).toEqual({
        success: false,
        error: 'Resource not found',
        code: 'NOT_FOUND',
      });
    });

    it('should create a not found response with custom resource', () => {
      const resource = 'Product';
      const response = createNotFoundResponse(resource);

      expect(response).toEqual({
        success: false,
        error: 'Product not found',
        code: 'NOT_FOUND',
      });
    });
  });

  describe('calculatePagination', () => {
    it('should calculate pagination metadata correctly', () => {
      const total = 25;
      const page = 2;
      const limit = 10;

      const pagination = calculatePagination(total, page, limit);

      expect(pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
    });

    it('should handle exact division', () => {
      const total = 20;
      const page = 1;
      const limit = 10;

      const pagination = calculatePagination(total, page, limit);

      expect(pagination).toEqual({
        page: 1,
        limit: 10,
        total: 20,
        totalPages: 2,
      });
    });

    it('should handle zero total', () => {
      const total = 0;
      const page = 1;
      const limit = 10;

      const pagination = calculatePagination(total, page, limit);

      expect(pagination).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
    });
  });

  describe('Type Guards', () => {
    describe('isSuccessResponse', () => {
      it('should return true for success response', () => {
        const response = createSuccessResponse({ id: 1 });
        expect(isSuccessResponse(response)).toBe(true);
      });

      it('should return false for error response', () => {
        const response = createErrorResponse('Error');
        expect(isSuccessResponse(response)).toBe(false);
      });
    });

    describe('isErrorResponse', () => {
      it('should return true for error response', () => {
        const response = createErrorResponse('Error');
        expect(isErrorResponse(response)).toBe(true);
      });

      it('should return false for success response', () => {
        const response = createSuccessResponse({ id: 1 });
        expect(isErrorResponse(response)).toBe(false);
      });
    });
  });
});