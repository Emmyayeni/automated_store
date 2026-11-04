/**
 * Unit tests for validation utilities
 */

import {
  createValidator,
  validateFields,
  ValidationRules,
  CommonValidators,
  validateForm,
  createUserValidationSchema,
  createProductValidationSchema,
  createPharmacyProductValidationSchema,
  Validator,
} from '../validation';
import { VALIDATION_MESSAGES } from '@/lib/constants/validation-messages';

describe('Validation Utilities', () => {
  describe('createValidator', () => {
    it('should create a validator instance', () => {
      const validator = createValidator('testField');
      expect(validator).toBeInstanceOf(Validator);
    });
    
    it('should validate successfully with no rules', () => {
      const validator = createValidator('testField');
      const result = validator.validate('any value');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
    
    it('should validate with added rules', () => {
      const validator = createValidator<string>('testField')
        .addRule(ValidationRules.required('testField'));
      
      const validResult = validator.validate('valid value');
      expect(validResult.isValid).toBe(true);
      
      const invalidResult = validator.validate('');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toBe(VALIDATION_MESSAGES.REQUIRED('testField'));
    });
  });
  
  describe('ValidationRules', () => {
    describe('required', () => {
      const rule = ValidationRules.required('Test Field');
      
      it('should pass for non-empty strings', () => {
        expect(rule.validate('test')).toBe(true);
      });
      
      it('should fail for empty strings', () => {
        expect(rule.validate('')).toBe(false);
        expect(rule.validate('   ')).toBe(false);
      });
      
      it('should fail for null/undefined', () => {
        expect(rule.validate(null)).toBe(false);
        expect(rule.validate(undefined)).toBe(false);
      });
      
      it('should pass for non-empty arrays', () => {
        expect(rule.validate(['item'])).toBe(true);
      });
      
      it('should fail for empty arrays', () => {
        expect(rule.validate([])).toBe(false);
      });
    });
    
    describe('minLength', () => {
      const rule = ValidationRules.minLength('Test Field', 5);
      
      it('should pass for strings meeting minimum length', () => {
        expect(rule.validate('12345')).toBe(true);
        expect(rule.validate('123456')).toBe(true);
      });
      
      it('should fail for strings below minimum length', () => {
        expect(rule.validate('1234')).toBe(false);
      });
      
      it('should pass for empty strings (when not required)', () => {
        expect(rule.validate('')).toBe(true);
      });
    });
    
    describe('maxLength', () => {
      const rule = ValidationRules.maxLength('Test Field', 5);
      
      it('should pass for strings within maximum length', () => {
        expect(rule.validate('12345')).toBe(true);
        expect(rule.validate('1234')).toBe(true);
      });
      
      it('should fail for strings exceeding maximum length', () => {
        expect(rule.validate('123456')).toBe(false);
      });
    });
    
    describe('email', () => {
      const rule = ValidationRules.email();
      
      it('should pass for valid email addresses', () => {
        expect(rule.validate('test@example.com')).toBe(true);
        expect(rule.validate('user.name+tag@domain.co.uk')).toBe(true);
      });
      
      it('should fail for invalid email addresses', () => {
        expect(rule.validate('invalid-email')).toBe(false);
        expect(rule.validate('test@')).toBe(false);
        expect(rule.validate('@domain.com')).toBe(false);
      });
      
      it('should pass for empty strings (when not required)', () => {
        expect(rule.validate('')).toBe(true);
      });
    });
    
    describe('phone', () => {
      const rule = ValidationRules.phone();
      
      it('should pass for valid phone numbers', () => {
        expect(rule.validate('1234567890')).toBe(true);
        expect(rule.validate('+1234567890')).toBe(true);
        expect(rule.validate('123-456-7890')).toBe(true);
        expect(rule.validate('(123) 456-7890')).toBe(true);
      });
      
      it('should fail for invalid phone numbers', () => {
        expect(rule.validate('abc')).toBe(false);
        expect(rule.validate('123')).toBe(false);
      });
    });
    
    describe('number', () => {
      const rule = ValidationRules.number('Test Field');
      
      it('should pass for valid numbers', () => {
        expect(rule.validate(123)).toBe(true);
        expect(rule.validate('123')).toBe(true);
        expect(rule.validate('123.45')).toBe(true);
        expect(rule.validate('-123')).toBe(true);
      });
      
      it('should fail for non-numeric values', () => {
        expect(rule.validate('abc')).toBe(false);
        expect(rule.validate('12abc')).toBe(false);
      });
      
      it('should pass for empty values (when not required)', () => {
        expect(rule.validate('')).toBe(true);
        expect(rule.validate(null)).toBe(true);
        expect(rule.validate(undefined)).toBe(true);
      });
    });
    
    describe('positiveNumber', () => {
      const rule = ValidationRules.positiveNumber('Test Field');
      
      it('should pass for positive numbers', () => {
        expect(rule.validate(1)).toBe(true);
        expect(rule.validate('123.45')).toBe(true);
      });
      
      it('should fail for zero and negative numbers', () => {
        expect(rule.validate(0)).toBe(false);
        expect(rule.validate(-1)).toBe(false);
        expect(rule.validate('-123')).toBe(false);
      });
    });
    
    describe('nonNegativeNumber', () => {
      const rule = ValidationRules.nonNegativeNumber('Test Field');
      
      it('should pass for zero and positive numbers', () => {
        expect(rule.validate(0)).toBe(true);
        expect(rule.validate(1)).toBe(true);
        expect(rule.validate('123.45')).toBe(true);
      });
      
      it('should fail for negative numbers', () => {
        expect(rule.validate(-1)).toBe(false);
        expect(rule.validate('-123')).toBe(false);
      });
    });
    
    describe('date', () => {
      const rule = ValidationRules.date('Test Field');
      
      it('should pass for valid dates', () => {
        expect(rule.validate(new Date())).toBe(true);
        expect(rule.validate('2023-12-25')).toBe(true);
        expect(rule.validate('12/25/2023')).toBe(true);
      });
      
      it('should fail for invalid dates', () => {
        expect(rule.validate('invalid-date')).toBe(false);
        expect(rule.validate('2023-13-45')).toBe(false);
      });
    });
    
    describe('futureDate', () => {
      const rule = ValidationRules.futureDate('Test Field');
      
      it('should pass for future dates', () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        expect(rule.validate(futureDate)).toBe(true);
      });
      
      it('should fail for past dates', () => {
        const pastDate = new Date();
        pastDate.setFullYear(pastDate.getFullYear() - 1);
        expect(rule.validate(pastDate)).toBe(false);
      });
    });
    
    describe('role', () => {
      const rule = ValidationRules.role();
      
      it('should pass for valid roles', () => {
        expect(rule.validate('ADMIN')).toBe(true);
        expect(rule.validate('MANAGER')).toBe(true);
        expect(rule.validate('CASHIER')).toBe(true);
        expect(rule.validate('admin')).toBe(true); // Should normalize
      });
      
      it('should fail for invalid roles', () => {
        expect(rule.validate('INVALID_ROLE')).toBe(false);
        expect(rule.validate('user')).toBe(false);
      });
    });
  });
  
  describe('CommonValidators', () => {
    describe('email', () => {
      it('should create email validator with proper rules', () => {
        const validator = CommonValidators.email(true);
        
        // Should pass valid email
        const validResult = validator.validate('test@example.com');
        expect(validResult.isValid).toBe(true);
        
        // Should fail empty when required
        const emptyResult = validator.validate('');
        expect(emptyResult.isValid).toBe(false);
        
        // Should fail invalid email
        const invalidResult = validator.validate('invalid-email');
        expect(invalidResult.isValid).toBe(false);
      });
      
      it('should allow empty when not required', () => {
        const validator = CommonValidators.email(false);
        const result = validator.validate('');
        expect(result.isValid).toBe(true);
      });
    });
    
    describe('password', () => {
      it('should enforce minimum length', () => {
        const validator = CommonValidators.password(true);
        
        const shortResult = validator.validate('123');
        expect(shortResult.isValid).toBe(false);
        
        const validResult = validator.validate('12345678');
        expect(validResult.isValid).toBe(true);
      });
    });
    
    describe('price', () => {
      it('should require positive numbers', () => {
        const validator = CommonValidators.price(true);
        
        const validResult = validator.validate('10.99');
        expect(validResult.isValid).toBe(true);
        
        const negativeResult = validator.validate('-5');
        expect(negativeResult.isValid).toBe(false);
        
        const zeroResult = validator.validate('0');
        expect(zeroResult.isValid).toBe(false);
      });
    });
    
    describe('stockQuantity', () => {
      it('should allow zero and positive numbers', () => {
        const validator = CommonValidators.stockQuantity(true);
        
        const zeroResult = validator.validate('0');
        expect(zeroResult.isValid).toBe(true);
        
        const positiveResult = validator.validate('10');
        expect(positiveResult.isValid).toBe(true);
        
        const negativeResult = validator.validate('-5');
        expect(negativeResult.isValid).toBe(false);
      });
    });
  });
  
  describe('validateFields', () => {
    it('should validate multiple fields', () => {
      const validators = {
        name: CommonValidators.name('Name', true),
        email: CommonValidators.email(true),
        price: CommonValidators.price(true),
      };
      
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        price: '10.99',
      };
      
      const result = validateFields(validators, validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should collect all validation errors', () => {
      const validators = {
        name: CommonValidators.name('Name', true),
        email: CommonValidators.email(true),
        price: CommonValidators.price(true),
      };
      
      const invalidData = {
        name: '',
        email: 'invalid-email',
        price: '-5',
      };
      
      const result = validateFields(validators, invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });
  });
  
  describe('Validation Schemas', () => {
    describe('createUserValidationSchema', () => {
      it('should create schema with required fields', () => {
        const schema = createUserValidationSchema({
          requireName: true,
          requireEmail: true,
          requirePassword: true,
          requireRole: true,
        });
        
        expect(schema).toHaveProperty('name');
        expect(schema).toHaveProperty('email');
        expect(schema).toHaveProperty('password');
        expect(schema).toHaveProperty('role');
      });
      
      it('should create schema without optional fields', () => {
        const schema = createUserValidationSchema({
          requirePassword: false,
        });
        
        expect(schema).toHaveProperty('name');
        expect(schema).toHaveProperty('email');
        expect(schema).not.toHaveProperty('password');
        expect(schema).toHaveProperty('role');
      });
    });
    
    describe('createProductValidationSchema', () => {
      it('should create product validation schema', () => {
        const schema = createProductValidationSchema();
        
        expect(schema).toHaveProperty('name');
        expect(schema).toHaveProperty('sku');
        expect(schema).toHaveProperty('price');
        expect(schema).toHaveProperty('stockQuantity');
      });
    });
    
    describe('createPharmacyProductValidationSchema', () => {
      it('should create pharmacy product validation schema', () => {
        const schema = createPharmacyProductValidationSchema();
        
        expect(schema).toHaveProperty('name');
        expect(schema).toHaveProperty('sku');
        expect(schema).toHaveProperty('price');
        expect(schema).toHaveProperty('stockQuantity');
        expect(schema).toHaveProperty('genericName');
        expect(schema).toHaveProperty('brandName');
        expect(schema).toHaveProperty('strength');
        expect(schema).toHaveProperty('expiryDate');
      });
    });
  });
  
  describe('validateForm', () => {
    it('should validate entire form data', () => {
      const schema = createUserValidationSchema();
      
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'ADMIN',
      };
      
      const result = validateForm(validData, schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should return validation errors for invalid form data', () => {
      const schema = createUserValidationSchema();
      
      const invalidData = {
        name: '',
        email: 'invalid-email',
        role: 'INVALID_ROLE',
      };
      
      const result = validateForm(invalidData, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});