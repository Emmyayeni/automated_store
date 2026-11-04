/**
 * Unit tests for error handling framework
 */

import { NextResponse } from 'next/server';
import {
  ApiError,
  ValidationError,
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
  type ErrorContext,
  type Logger,
} from '../error-handling';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({
      data,
      status: options?.status || 200,
    })),
  },
}));

describe('Error Handling Framework', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    };
    setLogger(mockLogger);
    jest.clearAllMocks();
  });

  describe('Error Classes', () => {
    describe('ApiError', () => {
      it('should create an API error with default values', () => {
        const error = new ApiError('Test error');

        expect(error.message).toBe('Test error');
        expect(error.statusCode).toBe(500);
        expect(error.code).toBe('INTERNAL_ERROR');
        expect(error.category).toBe(ErrorCategory.SYSTEM);
        expect(error.name).toBe('ApiError');
      });

      it('should create an API error with custom values', () => {
        const context: Partial<ErrorContext> = {
          userId: 'user123',
          endpoint: '/api/test',
        };

        const error = new ApiError(
          'Custom error',
          400,
          'CUSTOM_ERROR',
          ErrorCategory.VALIDATION,
          context
        );

        expect(error.message).toBe('Custom error');
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe('CUSTOM_ERROR');
        expect(error.category).toBe(ErrorCategory.VALIDATION);
        expect(error.context).toEqual(context);
      });
    });

    describe('ValidationError', () => {
      it('should create a validation error', () => {
        const error = new ValidationError('Email is required', 'email', '');

        expect(error.message).toBe('Email is required');
        expect(error.field).toBe('email');
        expect(error.value).toBe('');
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.category).toBe(ErrorCategory.VALIDATION);
        expect(error.name).toBe('ValidationError');
      });
    });

    describe('AuthenticationError', () => {
      it('should create an authentication error with default message', () => {
        const error = new AuthenticationError();

        expect(error.message).toBe('Authentication required');
        expect(error.statusCode).toBe(401);
        expect(error.code).toBe('AUTH_ERROR');
        expect(error.category).toBe(ErrorCategory.AUTHENTICATION);
      });

      it('should create an authentication error with custom message', () => {
        const error = new AuthenticationError('Invalid token');

        expect(error.message).toBe('Invalid token');
      });
    });

    describe('AuthorizationError', () => {
      it('should create an authorization error with default message', () => {
        const error = new AuthorizationError();

        expect(error.message).toBe('Insufficient permissions');
        expect(error.statusCode).toBe(403);
        expect(error.code).toBe('AUTHORIZATION_ERROR');
        expect(error.category).toBe(ErrorCategory.AUTHORIZATION);
      });
    });

    describe('NotFoundError', () => {
      it('should create a not found error with default resource', () => {
        const error = new NotFoundError();

        expect(error.message).toBe('Resource not found');
        expect(error.resource).toBe('Resource');
        expect(error.statusCode).toBe(404);
        expect(error.code).toBe('NOT_FOUND');
      });

      it('should create a not found error with custom resource', () => {
        const error = new NotFoundError('Product');

        expect(error.message).toBe('Product not found');
        expect(error.resource).toBe('Product');
      });
    });

    describe('BusinessLogicError', () => {
      it('should create a business logic error', () => {
        const error = new BusinessLogicError('Insufficient inventory');

        expect(error.message).toBe('Insufficient inventory');
        expect(error.statusCode).toBe(422);
        expect(error.code).toBe('BUSINESS_LOGIC_ERROR');
        expect(error.category).toBe(ErrorCategory.BUSINESS_LOGIC);
      });
    });

    describe('DatabaseError', () => {
      it('should create a database error', () => {
        const error = new DatabaseError('Connection failed', 'connect');

        expect(error.message).toBe('Connection failed');
        expect(error.operation).toBe('connect');
        expect(error.statusCode).toBe(500);
        expect(error.code).toBe('DATABASE_ERROR');
        expect(error.category).toBe(ErrorCategory.DATABASE);
      });
    });

    describe('ExternalServiceError', () => {
      it('should create an external service error', () => {
        const error = new ExternalServiceError('Service unavailable', 'payment-gateway');

        expect(error.message).toBe('Service unavailable');
        expect(error.service).toBe('payment-gateway');
        expect(error.statusCode).toBe(502);
        expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
        expect(error.category).toBe(ErrorCategory.EXTERNAL_SERVICE);
      });

      it('should create an external service error with custom status code', () => {
        const error = new ExternalServiceError('Rate limited', 'api', 429);

        expect(error.statusCode).toBe(429);
      });
    });
  });

  describe('Error Context', () => {
    it('should create error context from request', () => {
      const mockRequest = new Request('https://example.com/api/test', {
        method: 'POST',
        headers: {
          'user-agent': 'test-agent',
          'x-request-id': 'req-123',
        },
      });

      const context = createErrorContext(mockRequest, { customData: 'test' });

      expect(context.endpoint).toBe('/api/test');
      expect(context.method).toBe('POST');
      expect(context.userAgent).toBe('test-agent');
      expect(context.requestId).toBe('req-123');
      expect(context.additionalData).toEqual({ customData: 'test' });
      expect(context.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Error Logging', () => {
    it('should log error with proper format', () => {
      const error = new Error('Test error');
      const context: Partial<ErrorContext> = {
        userId: 'user123',
        endpoint: '/api/test',
      };

      logError(error, ErrorCategory.VALIDATION, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'VALIDATION: Test error',
        expect.objectContaining({
          name: 'Error',
          message: 'Test error',
          category: ErrorCategory.VALIDATION,
          context: expect.objectContaining({
            userId: 'user123',
            endpoint: '/api/test',
            timestamp: expect.any(String),
          }),
        })
      );
    });
  });

  describe('handleApiError', () => {
    it('should handle ApiError correctly', () => {
      const error = new ValidationError('Invalid email', 'email');
      const context: Partial<ErrorContext> = { endpoint: '/api/test' };

      const response = handleApiError(error, context);

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Invalid email',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle generic Error in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Generic error');
      const response = handleApiError(error);

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Generic error',
          code: 'INTERNAL_ERROR',
        },
        { status: 500 }
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle generic Error in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Internal details');
      const response = handleApiError(error);

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'An unexpected error occurred',
          code: 'INTERNAL_ERROR',
        },
        { status: 500 }
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle unknown error types', () => {
      const error = 'string error';
      const response = handleApiError(error);

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'An unknown error occurred',
          code: 'UNKNOWN_ERROR',
        },
        { status: 500 }
      );
    });
  });

  describe('withErrorHandler', () => {
    it('should wrap handler and catch errors', async () => {
      const mockHandler = jest.fn().mockRejectedValue(new ValidationError('Test error', 'field'));
      const wrappedHandler = withErrorHandler(mockHandler);

      const result = await wrappedHandler('arg1', 'arg2');

      expect(mockHandler).toHaveBeenCalledWith('arg1', 'arg2');
      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Test error',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    });

    it('should return handler result when no error occurs', async () => {
      const expectedResult = { success: true, data: 'test' };
      const mockHandler = jest.fn().mockResolvedValue(expectedResult);
      const wrappedHandler = withErrorHandler(mockHandler);

      const result = await wrappedHandler();

      expect(result).toBe(expectedResult);
    });
  });

  describe('Assertion Utilities', () => {
    describe('assertRequired', () => {
      it('should not throw for valid values', () => {
        expect(() => assertRequired('value', 'field')).not.toThrow();
        expect(() => assertRequired(0, 'field')).not.toThrow();
        expect(() => assertRequired(false, 'field')).not.toThrow();
      });

      it('should throw ValidationError for null', () => {
        expect(() => assertRequired(null, 'field')).toThrow(ValidationError);
      });

      it('should throw ValidationError for undefined', () => {
        expect(() => assertRequired(undefined, 'field')).toThrow(ValidationError);
      });
    });

    describe('assertRole', () => {
      it('should not throw for matching roles', () => {
        expect(() => assertRole('ADMIN', 'ADMIN')).not.toThrow();
      });

      it('should throw AuthorizationError for non-matching roles', () => {
        expect(() => assertRole('CASHIER', 'ADMIN')).toThrow(AuthorizationError);
      });
    });

    describe('assertExists', () => {
      it('should not throw for existing resources', () => {
        expect(() => assertExists({ id: 1 }, 'Product')).not.toThrow();
        expect(() => assertExists('value', 'String')).not.toThrow();
      });

      it('should throw NotFoundError for null', () => {
        expect(() => assertExists(null, 'Product')).toThrow(NotFoundError);
      });

      it('should throw NotFoundError for undefined', () => {
        expect(() => assertExists(undefined, 'Product')).toThrow(NotFoundError);
      });
    });
  });

  describe('Logger Management', () => {
    it('should set and get logger', () => {
      const customLogger: Logger = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
      };

      setLogger(customLogger);
      expect(getLogger()).toBe(customLogger);
    });
  });
});