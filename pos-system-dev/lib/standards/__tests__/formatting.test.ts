/**
 * Unit tests for formatting utilities
 */

import {
  formatDate,
  formatDisplayDate,
  formatDisplayDateTime,
  formatApiDate,
  formatShortDate,
  formatLongDate,
  formatTime,
  formatRelativeDate,
  formatContextualDate,
  isToday,
  isYesterday,
  updateBusinessSettings,
  getBusinessSettings,
  type DateFormatOptions,
} from '../formatting';

describe('Date Formatting Utilities', () => {
  // Test date: December 15, 2023, 2:30 PM UTC
  const testDate = new Date('2023-12-15T14:30:00.000Z');
  const testDateString = '2023-12-15T14:30:00.000Z';
  const testDateTimestamp = testDate.getTime();

  beforeEach(() => {
    // Reset business settings to defaults
    updateBusinessSettings({
      timezone: 'Africa/Freetown',
      locale: 'en-SL',
      currency: 'SLL',
    });
  });

  describe('formatDate', () => {
    it('should format date with default options', () => {
      const result = formatDate(testDate);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should handle string date input', () => {
      const result = formatDate(testDateString);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should handle timestamp input', () => {
      const result = formatDate(testDateTimestamp);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should return empty string for null/undefined', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
    });

    it('should return empty string for invalid date', () => {
      expect(formatDate('invalid-date')).toBe('');
      expect(formatDate(new Date('invalid'))).toBe('');
    });

    it('should format with custom locale', () => {
      const options: DateFormatOptions = {
        locale: 'en-US',
        dateStyle: 'medium',
      };
      const result = formatDate(testDate, options);
      expect(result).toBeTruthy();
    });

    it('should format with time included', () => {
      const options: DateFormatOptions = {
        includeTime: true,
        dateStyle: 'medium',
        timeStyle: 'short',
      };
      const result = formatDate(testDate, options);
      expect(result).toBeTruthy();
      // Should contain both date and time elements
      expect(result.length).toBeGreaterThan(10);
    });

    it('should handle different date styles', () => {
      const styles: Array<'full' | 'long' | 'medium' | 'short'> = ['full', 'long', 'medium', 'short'];
      
      styles.forEach(style => {
        const result = formatDate(testDate, { dateStyle: style });
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
      });
    });

    it('should use business settings timezone', () => {
      updateBusinessSettings({ timezone: 'UTC' });
      const result = formatDate(testDate);
      expect(result).toBeTruthy();
    });
  });

  describe('formatDisplayDate', () => {
    it('should format date for display without time', () => {
      const result = formatDisplayDate(testDate);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      // Should not contain time indicators
      expect(result.toLowerCase()).not.toMatch(/am|pm|\d{1,2}:\d{2}/);
    });

    it('should handle null input', () => {
      expect(formatDisplayDate(null)).toBe('');
    });
  });

  describe('formatDisplayDateTime', () => {
    it('should format date and time for display', () => {
      const result = formatDisplayDateTime(testDate);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      // Should contain both date and time elements
      expect(result.length).toBeGreaterThan(10);
    });

    it('should handle null input', () => {
      expect(formatDisplayDateTime(null)).toBe('');
    });
  });

  describe('formatApiDate', () => {
    it('should format date as ISO string', () => {
      const result = formatApiDate(testDate);
      expect(result).toBe('2023-12-15T14:30:00.000Z');
    });

    it('should handle string input', () => {
      const result = formatApiDate(testDateString);
      expect(result).toBe('2023-12-15T14:30:00.000Z');
    });

    it('should handle null input', () => {
      expect(formatApiDate(null)).toBe('');
    });

    it('should handle invalid date', () => {
      expect(formatApiDate('invalid')).toBe('');
    });
  });

  describe('formatShortDate', () => {
    it('should format date in short format', () => {
      const result = formatShortDate(testDate);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should handle null input', () => {
      expect(formatShortDate(null)).toBe('');
    });
  });

  describe('formatLongDate', () => {
    it('should format date in long format', () => {
      const result = formatLongDate(testDate);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      // Long format should be longer than short format
      const shortResult = formatShortDate(testDate);
      expect(result.length).toBeGreaterThan(shortResult.length);
    });

    it('should handle null input', () => {
      expect(formatLongDate(null)).toBe('');
    });
  });

  describe('formatTime', () => {
    it('should format time only', () => {
      const result = formatTime(testDate);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      // Should be relatively short (time only)
      expect(result.length).toBeLessThan(15);
    });

    it('should handle null input', () => {
      expect(formatTime(null)).toBe('');
    });
  });

  describe('formatRelativeDate', () => {
    it('should format recent date as relative', () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const result = formatRelativeDate(oneHourAgo);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should format future date as relative', () => {
      const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
      const result = formatRelativeDate(oneHourFromNow);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should handle null input', () => {
      expect(formatRelativeDate(null)).toBe('');
    });

    it('should fallback gracefully on error', () => {
      // Test with a date that might cause issues
      const result = formatRelativeDate(testDate);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('isToday', () => {
    it('should return true for today\'s date', () => {
      const today = new Date();
      expect(isToday(today)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });

    it('should return false for null input', () => {
      expect(isToday(null)).toBe(false);
    });

    it('should return false for invalid date', () => {
      expect(isToday('invalid')).toBe(false);
    });
  });

  describe('isYesterday', () => {
    it('should return true for yesterday\'s date', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isYesterday(yesterday)).toBe(true);
    });

    it('should return false for today', () => {
      const today = new Date();
      expect(isYesterday(today)).toBe(false);
    });

    it('should return false for null input', () => {
      expect(isYesterday(null)).toBe(false);
    });
  });

  describe('formatContextualDate', () => {
    it('should return "Today" for today\'s date', () => {
      const today = new Date();
      expect(formatContextualDate(today)).toBe('Today');
    });

    it('should return "Yesterday" for yesterday\'s date', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(formatContextualDate(yesterday)).toBe('Yesterday');
    });

    it('should return formatted date for other dates', () => {
      const result = formatContextualDate(testDate);
      expect(result).toBeTruthy();
      expect(result).not.toBe('Today');
      expect(result).not.toBe('Yesterday');
    });

    it('should handle null input', () => {
      expect(formatContextualDate(null)).toBe('');
    });
  });

  describe('Business Settings', () => {
    it('should update business settings', () => {
      const newSettings = {
        timezone: 'UTC',
        locale: 'en-US',
        currency: 'USD',
      };
      
      updateBusinessSettings(newSettings);
      const settings = getBusinessSettings();
      
      expect(settings.timezone).toBe('UTC');
      expect(settings.locale).toBe('en-US');
      expect(settings.currency).toBe('USD');
    });

    it('should partially update business settings', () => {
      updateBusinessSettings({ timezone: 'UTC' });
      const settings = getBusinessSettings();
      
      expect(settings.timezone).toBe('UTC');
      expect(settings.locale).toBe('en-SL'); // Should remain default
      expect(settings.currency).toBe('SLL'); // Should remain default
    });

    it('should use updated settings in formatting', () => {
      updateBusinessSettings({ locale: 'en-US' });
      const result = formatDate(testDate);
      expect(result).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle formatting errors gracefully', () => {
      // Mock Intl.DateTimeFormat to throw an error
      const originalDateTimeFormat = Intl.DateTimeFormat;
      (Intl as any).DateTimeFormat = jest.fn(() => {
        throw new Error('Formatting error');
      });

      const result = formatDate(testDate);
      expect(result).toBeTruthy(); // Should fallback
      expect(typeof result).toBe('string');

      // Restore original
      (Intl as any).DateTimeFormat = originalDateTimeFormat;
    });

    it('should handle relative time formatting errors gracefully', () => {
      // Mock Intl.RelativeTimeFormat to throw an error
      const originalRelativeTimeFormat = Intl.RelativeTimeFormat;
      (Intl as any).RelativeTimeFormat = jest.fn(() => {
        throw new Error('Relative formatting error');
      });

      const result = formatRelativeDate(testDate);
      expect(result).toBeTruthy(); // Should fallback to regular date
      expect(typeof result).toBe('string');

      // Restore original
      (Intl as any).RelativeTimeFormat = originalRelativeTimeFormat;
    });
  });
});

// Currency formatting tests
describe('Currency Formatting Utilities', () => {
  beforeEach(() => {
    // Reset currency settings to defaults
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

  describe('formatCurrency', () => {
    it('should format currency with default settings', () => {
      const result = formatCurrency(1234.56);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should handle string input', () => {
      const result = formatCurrency('1234.56');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should handle null/undefined input', () => {
      expect(formatCurrency(null)).toBeTruthy();
      expect(formatCurrency(undefined)).toBeTruthy();
    });

    it('should format with custom options', () => {
      const result = formatCurrency(1234.56, {
        showSymbol: false,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      expect(result).toBeTruthy();
      expect(result).not.toContain('Le');
    });

    it('should handle different currencies', () => {
      const result = formatCurrency(1234.56, {
        currency: 'USD',
        locale: 'en-US',
      });
      expect(result).toBeTruthy();
    });

    it('should show currency code when requested', () => {
      const result = formatCurrency(1234.56, {
        showCurrencyCode: true,
      });
      expect(result).toBeTruthy();
    });
  });

  describe('formatPrice', () => {
    it('should format price with symbol', () => {
      const result = formatPrice(1234.56);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should handle zero price', () => {
      const result = formatPrice(0);
      expect(result).toBeTruthy();
    });

    it('should handle negative price', () => {
      const result = formatPrice(-100);
      expect(result).toBeTruthy();
    });
  });

  describe('formatTotal', () => {
    it('should format total amount', () => {
      const result = formatTotal(1234.56);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('formatZeroAmount', () => {
    it('should format zero consistently', () => {
      const result = formatZeroAmount();
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('formatPriceNumeric', () => {
    it('should format without currency symbol', () => {
      const result = formatPriceNumeric(1234.56);
      expect(result).toBeTruthy();
      expect(result).not.toContain('Le');
      expect(result).not.toContain('$');
    });
  });

  describe('formatPriceWithCode', () => {
    it('should format with currency code', () => {
      const result = formatPriceWithCode(1234.56);
      expect(result).toBeTruthy();
    });
  });

  describe('formatPriceCompact', () => {
    it('should format large amounts compactly', () => {
      const result = formatPriceCompact(1234567);
      expect(result).toBeTruthy();
      expect(result).toContain('M');
    });

    it('should format thousands compactly', () => {
      const result = formatPriceCompact(12345);
      expect(result).toBeTruthy();
      expect(result).toContain('K');
    });

    it('should format small amounts normally', () => {
      const result = formatPriceCompact(123);
      expect(result).toBeTruthy();
      expect(result).not.toContain('K');
      expect(result).not.toContain('M');
    });
  });

  describe('formatPriceForInput', () => {
    it('should format for input field', () => {
      const result = formatPriceForInput(1234.5);
      expect(result).toBe('1234.50');
    });

    it('should handle null input', () => {
      const result = formatPriceForInput(null);
      expect(result).toBe('0.00');
    });
  });

  describe('parsePriceInput', () => {
    it('should parse valid price input', () => {
      const result = parsePriceInput('1234.56');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(1234.56);
    });

    it('should handle empty input', () => {
      const result = parsePriceInput('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle invalid input', () => {
      const result = parsePriceInput('invalid');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle negative input', () => {
      const result = parsePriceInput('-100');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle very large input', () => {
      const result = parsePriceInput('9999999999');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should parse input with currency symbols', () => {
      const result = parsePriceInput('Le1,234.56');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(1234.56);
    });
  });

  describe('formatPercentageOfAmount', () => {
    it('should calculate and format percentage', () => {
      const result = formatPercentageOfAmount(1000, 10);
      expect(result).toBeTruthy();
      // Should represent 10% of 1000 = 100
    });
  });

  describe('formatDiscount', () => {
    it('should format discount amount', () => {
      const result = formatDiscount(1000, 100);
      expect(result).toBeTruthy();
      expect(result).toContain('-');
    });

    it('should handle zero discount', () => {
      const result = formatDiscount(1000, 0);
      expect(result).toBe('');
    });
  });

  describe('formatQuantity', () => {
    it('should format quantity without unit', () => {
      const result = formatQuantity(1234);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should format quantity with unit', () => {
      const result = formatQuantity(1234, 'pcs');
      expect(result).toBeTruthy();
      expect(result).toContain('pcs');
    });
  });

  describe('formatTaxAmount', () => {
    it('should calculate and format tax', () => {
      const result = formatTaxAmount(1000, 15);
      expect(result).toBeTruthy();
      // Should represent 15% tax on 1000 = 150
    });
  });

  describe('formatPriceRange', () => {
    it('should format price range', () => {
      const result = formatPriceRange(100, 200);
      expect(result).toBeTruthy();
      expect(result).toContain('-');
    });

    it('should format single price when min equals max', () => {
      const result = formatPriceRange(100, 100);
      expect(result).toBeTruthy();
      expect(result).not.toContain('-');
    });
  });

  describe('Business Settings Integration', () => {
    it('should update currency settings', () => {
      updateBusinessCurrencySettings({
        currency: 'USD',
        symbol: '$',
        position: 'before',
      });

      const settings = getBusinessCurrencySettings();
      expect(settings.currency).toBe('USD');
      expect(settings.symbol).toBe('$');
      expect(settings.position).toBe('before');
    });

    it('should use updated settings in formatting', () => {
      updateBusinessCurrencySettings({
        symbol: '$',
        position: 'before',
      });

      const result = formatPrice(100);
      expect(result).toBeTruthy();
    });

    it('should update all business settings', () => {
      updateAllBusinessSettings({
        timezone: 'UTC',
        locale: 'en-US',
        currency: 'USD',
        currencySymbol: '$',
        currencyPosition: 'before',
        decimalPlaces: 2,
      });

      const allSettings = getAllBusinessSettings();
      expect(allSettings.date.timezone).toBe('UTC');
      expect(allSettings.currency.currency).toBe('USD');
    });
  });

  describe('Error Handling', () => {
    it('should handle currency formatting errors gracefully', () => {
      // Mock Intl.NumberFormat to throw an error
      const originalNumberFormat = Intl.NumberFormat;
      (Intl as any).NumberFormat = jest.fn(() => {
        throw new Error('Formatting error');
      });

      const result = formatCurrency(1234.56);
      expect(result).toBeTruthy(); // Should fallback
      expect(typeof result).toBe('string');

      // Restore original
      (Intl as any).NumberFormat = originalNumberFormat;
    });
  });
});