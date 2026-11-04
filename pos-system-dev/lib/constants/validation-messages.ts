/**
 * Standardized validation message constants and templates
 * Provides consistent error messaging across the application
 */

// Base validation message templates
export const VALIDATION_MESSAGES = {
  // Required field messages
  REQUIRED: (field: string) => `${field} is required`,
  
  // Format validation messages
  INVALID_FORMAT: (field: string, format: string) => `${field} must be in ${format} format`,
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PHONE: 'Please enter a valid phone number',
  INVALID_URL: 'Please enter a valid URL',
  
  // Length validation messages
  MIN_LENGTH: (field: string, min: number) => `${field} must be at least ${min} characters`,
  MAX_LENGTH: (field: string, max: number) => `${field} cannot exceed ${max} characters`,
  EXACT_LENGTH: (field: string, length: number) => `${field} must be exactly ${length} characters`,
  
  // Number validation messages
  POSITIVE_NUMBER: (field: string) => `${field} must be a positive number`,
  NON_NEGATIVE_NUMBER: (field: string) => `${field} must be zero or greater`,
  MIN_VALUE: (field: string, min: number) => `${field} must be at least ${min}`,
  MAX_VALUE: (field: string, max: number) => `${field} cannot exceed ${max}`,
  INVALID_NUMBER: (field: string) => `${field} must be a valid number`,
  
  // Date validation messages
  INVALID_DATE: (field: string) => `${field} must be a valid date`,
  FUTURE_DATE: (field: string) => `${field} must be a future date`,
  PAST_DATE: (field: string) => `${field} must be a past date`,
  DATE_RANGE: (field: string, start: string, end: string) => `${field} must be between ${start} and ${end}`,
  
  // Business rule validation messages
  DUPLICATE_VALUE: (field: string) => `${field} already exists`,
  INVALID_SELECTION: (field: string) => `Please select a valid ${field}`,
  INSUFFICIENT_STOCK: (product: string, available: number) => `Insufficient stock for ${product}. Only ${available} available`,
  EXPIRED_ITEM: (item: string) => `${item} has expired and cannot be used`,
  
  // Authentication and authorization messages
  INVALID_CREDENTIALS: 'Invalid email or password',
  ACCOUNT_DISABLED: 'Your account has been disabled. Please contact an administrator',
  INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action',
  SESSION_EXPIRED: 'Your session has expired. Please log in again',
  
  // File validation messages
  INVALID_FILE_TYPE: (field: string, allowedTypes: string[]) => 
    `${field} must be one of the following types: ${allowedTypes.join(', ')}`,
  FILE_TOO_LARGE: (field: string, maxSize: string) => `${field} must be smaller than ${maxSize}`,
  FILE_REQUIRED: (field: string) => `Please select a ${field}`,
} as const;

// Field-specific validation messages for common form fields
export const FIELD_VALIDATION_MESSAGES = {
  // User fields
  firstName: {
    required: VALIDATION_MESSAGES.REQUIRED('First name'),
    minLength: VALIDATION_MESSAGES.MIN_LENGTH('First name', 2),
    maxLength: VALIDATION_MESSAGES.MAX_LENGTH('First name', 50),
  },
  lastName: {
    required: VALIDATION_MESSAGES.REQUIRED('Last name'),
    minLength: VALIDATION_MESSAGES.MIN_LENGTH('Last name', 2),
    maxLength: VALIDATION_MESSAGES.MAX_LENGTH('Last name', 50),
  },
  name: {
    required: VALIDATION_MESSAGES.REQUIRED('Name'),
    minLength: VALIDATION_MESSAGES.MIN_LENGTH('Name', 2),
    maxLength: VALIDATION_MESSAGES.MAX_LENGTH('Name', 100),
  },
  email: {
    required: VALIDATION_MESSAGES.REQUIRED('Email'),
    invalid: VALIDATION_MESSAGES.INVALID_EMAIL,
    maxLength: VALIDATION_MESSAGES.MAX_LENGTH('Email', 255),
  },
  phone: {
    required: VALIDATION_MESSAGES.REQUIRED('Phone number'),
    invalid: VALIDATION_MESSAGES.INVALID_PHONE,
  },
  password: {
    required: VALIDATION_MESSAGES.REQUIRED('Password'),
    minLength: VALIDATION_MESSAGES.MIN_LENGTH('Password', 8),
    maxLength: VALIDATION_MESSAGES.MAX_LENGTH('Password', 128),
  },
  role: {
    required: VALIDATION_MESSAGES.REQUIRED('Role'),
    invalid: VALIDATION_MESSAGES.INVALID_SELECTION('role'),
  },
  
  // Product fields
  productName: {
    required: VALIDATION_MESSAGES.REQUIRED('Product name'),
    minLength: VALIDATION_MESSAGES.MIN_LENGTH('Product name', 2),
    maxLength: VALIDATION_MESSAGES.MAX_LENGTH('Product name', 200),
  },
  sku: {
    required: VALIDATION_MESSAGES.REQUIRED('SKU'),
    minLength: VALIDATION_MESSAGES.MIN_LENGTH('SKU', 3),
    maxLength: VALIDATION_MESSAGES.MAX_LENGTH('SKU', 50),
    duplicate: VALIDATION_MESSAGES.DUPLICATE_VALUE('SKU'),
  },
  barcode: {
    invalid: VALIDATION_MESSAGES.INVALID_FORMAT('Barcode', 'valid barcode'),
    duplicate: VALIDATION_MESSAGES.DUPLICATE_VALUE('Barcode'),
  },
  price: {
    required: VALIDATION_MESSAGES.REQUIRED('Price'),
    positive: VALIDATION_MESSAGES.POSITIVE_NUMBER('Price'),
    invalid: VALIDATION_MESSAGES.INVALID_NUMBER('Price'),
  },
  cost: {
    nonNegative: VALIDATION_MESSAGES.NON_NEGATIVE_NUMBER('Cost'),
    invalid: VALIDATION_MESSAGES.INVALID_NUMBER('Cost'),
  },
  stockQuantity: {
    required: VALIDATION_MESSAGES.REQUIRED('Stock quantity'),
    nonNegative: VALIDATION_MESSAGES.NON_NEGATIVE_NUMBER('Stock quantity'),
    invalid: VALIDATION_MESSAGES.INVALID_NUMBER('Stock quantity'),
  },
  lowStockThreshold: {
    nonNegative: VALIDATION_MESSAGES.NON_NEGATIVE_NUMBER('Low stock threshold'),
    invalid: VALIDATION_MESSAGES.INVALID_NUMBER('Low stock threshold'),
  },
  
  // Pharmacy-specific fields
  drugName: {
    required: VALIDATION_MESSAGES.REQUIRED('Drug name'),
    minLength: VALIDATION_MESSAGES.MIN_LENGTH('Drug name', 2),
    maxLength: VALIDATION_MESSAGES.MAX_LENGTH('Drug name', 200),
  },
  genericName: {
    minLength: VALIDATION_MESSAGES.MIN_LENGTH('Generic name', 2),
    maxLength: VALIDATION_MESSAGES.MAX_LENGTH('Generic name', 200),
  },
  brandName: {
    minLength: VALIDATION_MESSAGES.MIN_LENGTH('Brand name', 2),
    maxLength: VALIDATION_MESSAGES.MAX_LENGTH('Brand name', 200),
  },
  strength: {
    required: VALIDATION_MESSAGES.REQUIRED('Strength'),
    maxLength: VALIDATION_MESSAGES.MAX_LENGTH('Strength', 50),
  },
  manufacturer: {
    maxLength: VALIDATION_MESSAGES.MAX_LENGTH('Manufacturer', 200),
  },
  expiryDate: {
    required: VALIDATION_MESSAGES.REQUIRED('Expiry date'),
    invalid: VALIDATION_MESSAGES.INVALID_DATE('Expiry date'),
    past: VALIDATION_MESSAGES.PAST_DATE('Expiry date'),
    expired: VALIDATION_MESSAGES.EXPIRED_ITEM('Product'),
  },
  batchNumber: {
    maxLength: VALIDATION_MESSAGES.MAX_LENGTH('Batch number', 100),
  },
  
  // Medical equipment fields
  modelNumber: {
    required: VALIDATION_MESSAGES.REQUIRED('Model number'),
    maxLength: VALIDATION_MESSAGES.MAX_LENGTH('Model number', 100),
  },
  serialNumber: {
    required: VALIDATION_MESSAGES.REQUIRED('Serial number'),
    maxLength: VALIDATION_MESSAGES.MAX_LENGTH('Serial number', 100),
    duplicate: VALIDATION_MESSAGES.DUPLICATE_VALUE('Serial number'),
  },
  warrantyPeriod: {
    maxLength: VALIDATION_MESSAGES.MAX_LENGTH('Warranty period', 50),
  },
  
  // Transaction fields
  quantity: {
    required: VALIDATION_MESSAGES.REQUIRED('Quantity'),
    positive: VALIDATION_MESSAGES.POSITIVE_NUMBER('Quantity'),
    invalid: VALIDATION_MESSAGES.INVALID_NUMBER('Quantity'),
    insufficientStock: (product: string, available: number) => 
      VALIDATION_MESSAGES.INSUFFICIENT_STOCK(product, available),
  },
  discount: {
    nonNegative: VALIDATION_MESSAGES.NON_NEGATIVE_NUMBER('Discount'),
    maxValue: VALIDATION_MESSAGES.MAX_VALUE('Discount', 100),
    invalid: VALIDATION_MESSAGES.INVALID_NUMBER('Discount'),
  },
  paymentMethod: {
    required: VALIDATION_MESSAGES.REQUIRED('Payment method'),
    invalid: VALIDATION_MESSAGES.INVALID_SELECTION('payment method'),
  },
  
  // Business fields
  businessName: {
    required: VALIDATION_MESSAGES.REQUIRED('Business name'),
    minLength: VALIDATION_MESSAGES.MIN_LENGTH('Business name', 2),
    maxLength: VALIDATION_MESSAGES.MAX_LENGTH('Business name', 200),
  },
  address: {
    required: VALIDATION_MESSAGES.REQUIRED('Address'),
    maxLength: VALIDATION_MESSAGES.MAX_LENGTH('Address', 500),
  },
  city: {
    required: VALIDATION_MESSAGES.REQUIRED('City'),
    maxLength: VALIDATION_MESSAGES.MAX_LENGTH('City', 100),
  },
  postalCode: {
    maxLength: VALIDATION_MESSAGES.MAX_LENGTH('Postal code', 20),
  },
} as const;

// Validation message builder functions
export const buildValidationMessage = {
  /**
   * Build a required field message
   */
  required: (fieldName: string): string => {
    return VALIDATION_MESSAGES.REQUIRED(fieldName);
  },
  
  /**
   * Build a format validation message
   */
  invalidFormat: (fieldName: string, expectedFormat: string): string => {
    return VALIDATION_MESSAGES.INVALID_FORMAT(fieldName, expectedFormat);
  },
  
  /**
   * Build a length validation message
   */
  length: (fieldName: string, min?: number, max?: number): string => {
    if (min && max) {
      return `${fieldName} must be between ${min} and ${max} characters`;
    }
    if (min) {
      return VALIDATION_MESSAGES.MIN_LENGTH(fieldName, min);
    }
    if (max) {
      return VALIDATION_MESSAGES.MAX_LENGTH(fieldName, max);
    }
    return `${fieldName} has invalid length`;
  },
  
  /**
   * Build a numeric range validation message
   */
  numericRange: (fieldName: string, min?: number, max?: number): string => {
    if (min !== undefined && max !== undefined) {
      return `${fieldName} must be between ${min} and ${max}`;
    }
    if (min !== undefined) {
      return VALIDATION_MESSAGES.MIN_VALUE(fieldName, min);
    }
    if (max !== undefined) {
      return VALIDATION_MESSAGES.MAX_VALUE(fieldName, max);
    }
    return VALIDATION_MESSAGES.INVALID_NUMBER(fieldName);
  },
  
  /**
   * Build a custom validation message with field name
   */
  custom: (fieldName: string, message: string): string => {
    return `${fieldName}: ${message}`;
  },
  
  /**
   * Build a business rule validation message
   */
  businessRule: (rule: string, context?: string): string => {
    return context ? `${rule} (${context})` : rule;
  },
};

// Export types for TypeScript support
export type ValidationMessageKey = keyof typeof VALIDATION_MESSAGES;
export type FieldValidationKey = keyof typeof FIELD_VALIDATION_MESSAGES;
export type ValidationMessageBuilder = typeof buildValidationMessage;