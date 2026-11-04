# Standardization Utilities

This directory contains standardized utilities and patterns for the HARDYPOS system to ensure consistency across the codebase.

## Modules

### API Responses (`api-responses.ts`)

Provides standardized response formats and builder functions for all API endpoints.

**Key Features:**
- Consistent success/error response formats
- Pagination support
- Validation error handling
- Type-safe response builders

**Usage:**
```typescript
import { createSuccessResponse, createErrorResponse } from '@/lib/standards/api-responses';

// Success response
return NextResponse.json(createSuccessResponse(data));

// Error response
return NextResponse.json(createErrorResponse('Error message', 'ERROR_CODE'));
```

### Error Handling (`error-handling.ts`)

Comprehensive error handling framework with standardized error classes and middleware.

**Key Features:**
- Standardized error classes (ApiError, ValidationError, etc.)
- Consistent error logging with context
- Error handler middleware for API routes
- Type-safe assertion utilities

**Usage:**
```typescript
import { handleApiError, ValidationError, withErrorHandler } from '@/lib/standards/error-handling';

// Throw standardized errors
throw new ValidationError('Email is required', 'email');

// Handle errors in API routes
export const POST = withErrorHandler(async (request: Request) => {
  // Your API logic here
});
```

## Directory Structure

```
lib/standards/
├── api-responses.ts      # API response utilities
├── error-handling.ts     # Error handling framework
├── index.ts             # Main exports
├── README.md            # This file
└── __tests__/           # Unit tests
    ├── api-responses.test.ts
    └── error-handling.test.ts
```

## Testing

Unit tests are provided for all utilities. The tests cover:
- Response format consistency
- Error class behavior
- Error handling middleware
- Type guards and assertions

## Integration

These utilities are designed to be used throughout the HARDYPOS codebase to ensure:
- Consistent API response formats
- Standardized error handling
- Proper error logging and context tracking
- Type safety across the application