/**
 * Standardized validation utilities and functions
 * Provides consistent validation patterns across the application
 */

import { VALIDATION_MESSAGES, FIELD_VALIDATION_MESSAGES, buildValidationMessage } from '@/lib/constants/validation-messages';
import { ROLES } from '@/lib/roles';

// Validation result types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FieldValidationResult {
  field: string;
  isValid: boolean;
  error?: string;
}

export interface ValidationRule<T = any> {
  validate: (value: T) => boolean;
  message: string;
}

export interface ValidationOptions {
  required?: boolean;
  trim?: boolean;
  allowEmpty?: boolean;
}

// Core validation utility class
export class Validator<T = any> {
  private rules: ValidationRule<T>[] = [];
  private fieldName: string;
  
  constructor(fieldName: string) {
    this.fieldName = fieldName;
  }
  
  /**
   * Add a validation rule
   */
  addRule(rule: ValidationRule<T>): this {
    this.rules.push(rule);
    return this;
  }
  
  /**
   * Add multiple validation rules
   */
  addRules(rules: ValidationRule<T>[]): this {
    this.rules.push(...rules);
    return this;
  }
  
  /**
   * Validate a value against all rules
   */
  validate(value: T): FieldValidationResult {
    for (const rule of this.rules) {
      if (!rule.validate(value)) {
        return {
          field: this.fieldName,
          isValid: false,
          error: rule.message,
        };
      }
    }
    
    return {
      field: this.fieldName,
      isValid: true,
    };
  }
}

/**
 * Create a validator for a specific field
 */
export const createValidator = <T = any>(fieldName: string): Validator<T> => {
  return new Validator<T>(fieldName);
};

/**
 * Validate multiple fields at once
 */
export const validateFields = (validators: Record<string, Validator>, data: Record<string, any>): ValidationResult => {
  const errors: string[] = [];
  
  for (const [fieldName, validator] of Object.entries(validators)) {
    const result = validator.validate(data[fieldName]);
    if (!result.isValid && result.error) {
      errors.push(result.error);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Common validation rules
export const ValidationRules = {
  /**
   * Required field validation
   */
  required: <T>(fieldName: string): ValidationRule<T> => ({
    validate: (value: T) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    },
    message: VALIDATION_MESSAGES.REQUIRED(fieldName),
  }),
  
  /**
   * String length validation
   */
  minLength: (fieldName: string, min: number): ValidationRule<string> => ({
    validate: (value: string) => !value || value.length >= min,
    message: VALIDATION_MESSAGES.MIN_LENGTH(fieldName, min),
  }),
  
  maxLength: (fieldName: string, max: number): ValidationRule<string> => ({
    validate: (value: string) => !value || value.length <= max,
    message: VALIDATION_MESSAGES.MAX_LENGTH(fieldName, max),
  }),
  
  exactLength: (fieldName: string, length: number): ValidationRule<string> => ({
    validate: (value: string) => !value || value.length === length,
    message: VALIDATION_MESSAGES.EXACT_LENGTH(fieldName, length),
  }),
  
  /**
   * Email validation
   */
  email: (): ValidationRule<string> => ({
    validate: (value: string) => {
      if (!value) return true; // Allow empty if not required
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message: VALIDATION_MESSAGES.INVALID_EMAIL,
  }),
  
  /**
   * Phone number validation (basic format)
   */
  phone: (): ValidationRule<string> => ({
    validate: (value: string) => {
      if (!value) return true; // Allow empty if not required
      // Basic phone validation - adjust regex as needed for specific formats
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      return phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''));
    },
    message: VALIDATION_MESSAGES.INVALID_PHONE,
  }),
  
  /**
   * URL validation
   */
  url: (): ValidationRule<string> => ({
    validate: (value: string) => {
      if (!value) return true; // Allow empty if not required
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message: VALIDATION_MESSAGES.INVALID_URL,
  }),
  
  /**
   * Numeric validation
   */
  number: (fieldName: string): ValidationRule<string | number> => ({
    validate: (value: string | number) => {
      if (value === '' || value === null || value === undefined) return true;
      return !isNaN(Number(value));
    },
    message: VALIDATION_MESSAGES.INVALID_NUMBER(fieldName),
  }),
  
  positiveNumber: (fieldName: string): ValidationRule<string | number> => ({
    validate: (value: string | number) => {
      if (value === '' || value === null || value === undefined) return true;
      const num = Number(value);
      return !isNaN(num) && num > 0;
    },
    message: VALIDATION_MESSAGES.POSITIVE_NUMBER(fieldName),
  }),
  
  nonNegativeNumber: (fieldName: string): ValidationRule<string | number> => ({
    validate: (value: string | number) => {
      if (value === '' || value === null || value === undefined) return true;
      const num = Number(value);
      return !isNaN(num) && num >= 0;
    },
    message: VALIDATION_MESSAGES.NON_NEGATIVE_NUMBER(fieldName),
  }),
  
  minValue: (fieldName: string, min: number): ValidationRule<string | number> => ({
    validate: (value: string | number) => {
      if (value === '' || value === null || value === undefined) return true;
      const num = Number(value);
      return !isNaN(num) && num >= min;
    },
    message: VALIDATION_MESSAGES.MIN_VALUE(fieldName, min),
  }),
  
  maxValue: (fieldName: string, max: number): ValidationRule<string | number> => ({
    validate: (value: string | number) => {
      if (value === '' || value === null || value === undefined) return true;
      const num = Number(value);
      return !isNaN(num) && num <= max;
    },
    message: VALIDATION_MESSAGES.MAX_VALUE(fieldName, max),
  }),
  
  /**
   * Date validation
   */
  date: (fieldName: string): ValidationRule<string | Date> => ({
    validate: (value: string | Date) => {
      if (!value) return true; // Allow empty if not required
      const date = new Date(value);
      return !isNaN(date.getTime());
    },
    message: VALIDATION_MESSAGES.INVALID_DATE(fieldName),
  }),
  
  futureDate: (fieldName: string): ValidationRule<string | Date> => ({
    validate: (value: string | Date) => {
      if (!value) return true; // Allow empty if not required
      const date = new Date(value);
      return !isNaN(date.getTime()) && date > new Date();
    },
    message: VALIDATION_MESSAGES.FUTURE_DATE(fieldName),
  }),
  
  pastDate: (fieldName: string): ValidationRule<string | Date> => ({
    validate: (value: string | Date) => {
      if (!value) return true; // Allow empty if not required
      const date = new Date(value);
      return !isNaN(date.getTime()) && date < new Date();
    },
    message: VALIDATION_MESSAGES.PAST_DATE(fieldName),
  }),
  
  /**
   * Role validation
   */
  role: (): ValidationRule<string> => ({
    validate: (value: string) => {
      if (!value) return true; // Allow empty if not required
      const normalizedRole = value.toUpperCase();
      return Object.values(ROLES).includes(normalizedRole as any);
    },
    message: VALIDATION_MESSAGES.INVALID_SELECTION('role'),
  }),
  
  /**
   * Custom validation rule
   */
  custom: <T>(validate: (value: T) => boolean, message: string): ValidationRule<T> => ({
    validate,
    message,
  }),
};

// Pre-built validators for common fields
export const CommonValidators = {
  /**
   * Email field validator
   */
  email: (required = false) => {
    const validator = createValidator<string>('Email');
    if (required) {
      validator.addRule(ValidationRules.required('Email'));
    }
    return validator
      .addRule(ValidationRules.email())
      .addRule(ValidationRules.maxLength('Email', 255));
  },
  
  /**
   * Password field validator
   */
  password: (required = true) => {
    const validator = createValidator<string>('Password');
    if (required) {
      validator.addRule(ValidationRules.required('Password'));
    }
    return validator
      .addRule(ValidationRules.minLength('Password', 8))
      .addRule(ValidationRules.maxLength('Password', 128));
  },
  
  /**
   * Name field validator
   */
  name: (fieldName = 'Name', required = true) => {
    const validator = createValidator<string>(fieldName);
    if (required) {
      validator.addRule(ValidationRules.required(fieldName));
    }
    return validator
      .addRule(ValidationRules.minLength(fieldName, 2))
      .addRule(ValidationRules.maxLength(fieldName, 100));
  },
  
  /**
   * Phone field validator
   */
  phone: (required = false) => {
    const validator = createValidator<string>('Phone number');
    if (required) {
      validator.addRule(ValidationRules.required('Phone number'));
    }
    return validator.addRule(ValidationRules.phone());
  },
  
  /**
   * Role field validator
   */
  role: (required = true) => {
    const validator = createValidator<string>('Role');
    if (required) {
      validator.addRule(ValidationRules.required('Role'));
    }
    return validator.addRule(ValidationRules.role());
  },
  
  /**
   * Price field validator
   */
  price: (required = true) => {
    const validator = createValidator<string | number>('Price');
    if (required) {
      validator.addRule(ValidationRules.required('Price'));
    }
    return validator
      .addRule(ValidationRules.number('Price'))
      .addRule(ValidationRules.positiveNumber('Price'));
  },
  
  /**
   * Stock quantity validator
   */
  stockQuantity: (required = true) => {
    const validator = createValidator<string | number>('Stock quantity');
    if (required) {
      validator.addRule(ValidationRules.required('Stock quantity'));
    }
    return validator
      .addRule(ValidationRules.number('Stock quantity'))
      .addRule(ValidationRules.nonNegativeNumber('Stock quantity'));
  },
  
  /**
   * SKU field validator
   */
  sku: (required = true) => {
    const validator = createValidator<string>('SKU');
    if (required) {
      validator.addRule(ValidationRules.required('SKU'));
    }
    return validator
      .addRule(ValidationRules.minLength('SKU', 3))
      .addRule(ValidationRules.maxLength('SKU', 50));
  },
  
  /**
   * Product name validator
   */
  productName: (required = true) => {
    const validator = createValidator<string>('Product name');
    if (required) {
      validator.addRule(ValidationRules.required('Product name'));
    }
    return validator
      .addRule(ValidationRules.minLength('Product name', 2))
      .addRule(ValidationRules.maxLength('Product name', 200));
  },
  
  /**
   * Expiry date validator (for pharmacy products)
   */
  expiryDate: (required = true) => {
    const validator = createValidator<string | Date>('Expiry date');
    if (required) {
      validator.addRule(ValidationRules.required('Expiry date'));
    }
    return validator
      .addRule(ValidationRules.date('Expiry date'))
      .addRule(ValidationRules.futureDate('Expiry date'));
  },
  
  /**
   * Serial number validator (for equipment)
   */
  serialNumber: (required = true) => {
    const validator = createValidator<string>('Serial number');
    if (required) {
      validator.addRule(ValidationRules.required('Serial number'));
    }
    return validator.addRule(ValidationRules.maxLength('Serial number', 100));
  },
};

// Utility functions for form validation
export const validateForm = <T extends Record<string, any>>(
  data: T,
  validationSchema: Record<keyof T, Validator>
): ValidationResult => {
  return validateFields(validationSchema as Record<string, Validator>, data);
};

/**
 * Create a validation schema for common user forms
 */
export const createUserValidationSchema = (options: {
  requireName?: boolean;
  requireEmail?: boolean;
  requirePassword?: boolean;
  requireRole?: boolean;
} = {}) => {
  const {
    requireName = true,
    requireEmail = true,
    requirePassword = false,
    requireRole = true,
  } = options;
  
  return {
    name: CommonValidators.name('Name', requireName),
    email: CommonValidators.email(requireEmail),
    ...(requirePassword && { password: CommonValidators.password(true) }),
    role: CommonValidators.role(requireRole),
  };
};

/**
 * Create a validation schema for product forms
 */
export const createProductValidationSchema = (options: {
  requireSku?: boolean;
  requirePrice?: boolean;
  requireStock?: boolean;
} = {}) => {
  const {
    requireSku = true,
    requirePrice = true,
    requireStock = true,
  } = options;
  
  return {
    name: CommonValidators.productName(true),
    sku: CommonValidators.sku(requireSku),
    price: CommonValidators.price(requirePrice),
    stockQuantity: CommonValidators.stockQuantity(requireStock),
  };
};

/**
 * Create a validation schema for pharmacy product forms
 */
export const createPharmacyProductValidationSchema = () => {
  return {
    ...createProductValidationSchema(),
    genericName: CommonValidators.name('Generic name', false),
    brandName: CommonValidators.name('Brand name', false),
    strength: createValidator<string>('Strength')
      .addRule(ValidationRules.required('Strength'))
      .addRule(ValidationRules.maxLength('Strength', 50)),
    expiryDate: CommonValidators.expiryDate(true),
  };
};

// Export validation message constants for direct use
export { VALIDATION_MESSAGES, FIELD_VALIDATION_MESSAGES, buildValidationMessage };