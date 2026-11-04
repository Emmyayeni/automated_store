/**
 * Tests for enhanced currency formatting utilities
 * Validates business context-aware formatting and specialized formatters
 */

import {
  formatCurrency,
  formatPrice,
  formatTotal,
  formatZeroAmount,
  formatCurrencyEnhanced,
  formatCurrencyForContext,
  formatCurrencyPrecise,
  formatCurrencyTable,
  formatCurrencyChange,
  validateAndFormatCurrency,
  convertCurrency,
  formatCurrencyWithConversion,
  parsePrice,
  parsePriceInput,
  updateBusinessCurrencySettings,
  getBusinessCurrencySettings,
  type BusinessCurrencySettings,
  type CurrencyFormatOptions,
} from '../../price-utils';

describe('Enhanced Currency Formatting Utilities', () => {
  // Reset to default settings before each test
  beforeEach(() => {
    updateBusinessCurrencySettings({
      currency: 'SLL',
      locale: 'en-SL',
      symbol: 'Le',
      position: 'before',
      decimalPlaces: 2,
      thousandsSeparator: ',',
      decimalSeparator: '.',
    });
  });

  describe('Core Currency Formatting', () => {
    test('formatCurrency with default options', () => {
      expect(formatCurrency(1234.56)).toMatch(/Le.*1,234\.56/);
    });

    test('formatCurrency with custom options', () => {
      const result = formatCurrency(1234.56, {
        showSymbol: false,
        useGrouping: false,
        minimumFractionDigits: 3,
      });
      expect(result).toBe('1234.560');
    });

    test('formatCurrency handles null and undefined', () => {
      expect(formatCurrency(null)).toMatch(/Le.*0\.00/);
      expect(formatCurrency(undefined)).toMatch(/Le.*0\.00/);
    });

    test('formatCurrency maintains decimal precision', () => {
      const result = formatCurrency(1234.567);
      expect(result).toMatch(/1,234\.57/); // Should round to 2 decimal places
    });
  });

  describe('Specialized Formatters', () => {
    test('formatPrice uses standard formatting', () => {
      const result = formatPrice(1234.56);
      expect(result).toMatch(/Le.*1,234\.56/);
    });

    test('formatTotal emphasizes total nature', () => {
      const result = formatTotal(1234.56);
      expect(result).toMatch(/Le.*1,234\.56/);
    });

    test('formatZeroAmount shows consistent zero', () => {
      const result = formatZeroAmount();
      expect(result).toMatch(/Le.*0\.00/);
    });

    test('formatCurrencyPrecise respects custom decimal places', () => {
      const result = formatCurrencyPrecise(1234.56789, 4);
      expect(result).toMatch(/1,234\.5679/);
    });

    test('formatCurrencyTable handles alignment', () => {
      const result = formatCurrencyTable(123.45, { width: 15, align: 'right' });
      expect(result.length).toBe(15);
      expect(result.trim()).toMatch(/Le.*123\.45/);
    });

    test('formatCurrencyChange shows positive/negative indicators', () => {
      expect(formatCurrencyChange(123.45)).toMatch(/\+.*Le.*123\.45/);
      expect(formatCurrencyChange(-123.45)).toMatch(/-.*Le.*123\.45/);
    });
  });

  describe('Context-Aware Formatting', () => {
    test('formatCurrencyForContext handles different contexts', () => {
      const amount = 1234.56;
      
      expect(formatCurrencyForContext(amount, 'display')).toMatch(/Le.*1,234\.56/);
      expect(formatCurrencyForContext(amount, 'receipt')).toMatch(/Le.*1,234\.56/);
      expect(formatCurrencyForContext(amount, 'report')).toMatch(/Le.*1,234\.56.*SLL/);
      expect(formatCurrencyForContext(amount, 'api')).toBe('1234.56');
    });
  });

  describe('Enhanced Formatting with Validation', () => {
    test('formatCurrencyEnhanced validates amounts', () => {
      const validResult = formatCurrencyEnhanced(123.45);
      expect(validResult.isValid).toBe(true);
      expect(validResult.formattedAmount).toMatch(/Le.*123\.45/);

      const invalidResult = formatCurrencyEnhanced(-123.45);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toBe('Amount cannot be negative');
    });

    test('validateAndFormatCurrency provides detailed feedback', () => {
      const validResult = validateAndFormatCurrency('123.45');
      expect(validResult.isValid).toBe(true);
      expect(validResult.numericValue).toBe(123.45);
      expect(validResult.errors).toHaveLength(0);

      const invalidResult = validateAndFormatCurrency('invalid');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Currency Conversion', () => {
    test('convertCurrency performs basic conversion', () => {
      const result = convertCurrency(100, {
        fromCurrency: 'USD',
        toCurrency: 'SLL',
        rate: 20000,
      });
      
      expect(result.isValid).toBe(true);
      expect(result.convertedAmount).toBe(2000000);
    });

    test('convertCurrency handles same currency', () => {
      const result = convertCurrency(100, {
        fromCurrency: 'SLL',
        toCurrency: 'SLL',
      });
      
      expect(result.isValid).toBe(true);
      expect(result.convertedAmount).toBe(100);
    });

    test('convertCurrency validates rate', () => {
      const result = convertCurrency(100, {
        fromCurrency: 'USD',
        toCurrency: 'SLL',
        rate: 0,
      });
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid conversion rate provided');
    });

    test('formatCurrencyWithConversion shows both amounts', () => {
      const result = formatCurrencyWithConversion(100, {
        fromCurrency: 'USD',
        toCurrency: 'SLL',
        rate: 20000,
      });
      
      expect(result).toContain('Le100.00');
      expect(result).toContain('(');
      expect(result).toContain(')');
    });
  });

  describe('Business Settings Integration', () => {
    test('updateBusinessCurrencySettings affects formatting', () => {
      updateBusinessCurrencySettings({
        symbol: '$',
        position: 'before',
        decimalPlaces: 3,
      });

      const result = formatPrice(123.456);
      expect(result).toMatch(/\$.*123\.456/);
    });

    test('getBusinessCurrencySettings returns current settings', () => {
      const settings = getBusinessCurrencySettings();
      expect(settings).toHaveProperty('currency');
      expect(settings).toHaveProperty('locale');
      expect(settings).toHaveProperty('symbol');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('handles very large numbers', () => {
      const result = formatCurrencyEnhanced(999999999999);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Amount exceeds maximum allowed value');
    });

    test('handles very small numbers', () => {
      const result = validateAndFormatCurrency(0.001);
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('handles string inputs correctly', () => {
      expect(formatPrice('123.45')).toMatch(/Le.*123\.45/);
      expect(formatPrice('123,456.78')).toMatch(/Le.*123,456\.78/);
    });

    test('parsePrice handles various input types', () => {
      expect(parsePrice(123.45)).toBe(123.45);
      expect(parsePrice('123.45')).toBe(123.45);
      expect(parsePrice(null)).toBe(0);
      expect(parsePrice(undefined)).toBe(0);
      expect(parsePrice('invalid')).toBe(0);
    });

    test('parsePriceInput provides validation feedback', () => {
      const validResult = parsePriceInput('123.45');
      expect(validResult.isValid).toBe(true);
      expect(validResult.value).toBe(123.45);

      const invalidResult = parsePriceInput('');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toBe('Price is required');

      const negativeResult = parsePriceInput('-123.45');
      expect(negativeResult.isValid).toBe(false);
      expect(negativeResult.error).toBe('Price cannot be negative');
    });
  });

  describe('Requirement Compliance', () => {
    test('Requirement 6.1: Uses centralized formatPrice utility', () => {
      // Test that formatPrice is the main utility for currency display
      const result = formatPrice(123.45);
      expect(typeof result).toBe('string');
      expect(result).toMatch(/Le.*123\.45/);
    });

    test('Requirement 6.2: Maintains proper decimal precision', () => {
      // Test that calculations maintain precision
      const result = formatPrice(123.456789);
      expect(result).toMatch(/123\.46/); // Should round to 2 decimal places
    });

    test('Requirement 6.3: Uses business configured currency', () => {
      // Test that business settings are respected
      updateBusinessCurrencySettings({ symbol: '$', currency: 'USD' });
      const result = formatPrice(123.45);
      expect(result).toMatch(/\$.*123\.45/);
    });

    test('Requirement 6.4: Zero amounts display consistently', () => {
      // Test that zero amounts are formatted consistently
      const result = formatZeroAmount();
      expect(result).toMatch(/Le.*0\.00/);
    });

    test('Requirement 6.5: Currency conversion utilities available', () => {
      // Test that conversion utilities exist and work
      const result = convertCurrency(100, {
        fromCurrency: 'USD',
        toCurrency: 'SLL',
        rate: 20000,
      });
      expect(result.isValid).toBe(true);
      expect(typeof result.convertedAmount).toBe('number');
    });
  });
});