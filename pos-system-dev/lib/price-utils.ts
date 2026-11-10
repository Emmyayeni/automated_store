/**
 * Utility functions for handling price and numeric values from the database
 * Enhanced with business context-aware currency formatting
 */

// Currency formatting interfaces and types
export interface CurrencyFormatOptions {
  currency?: string;
  locale?: string;
  showSymbol?: boolean;
  showCurrencyCode?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  useGrouping?: boolean;
}

export interface BusinessCurrencySettings {
  currency: string;
  locale: string;
  symbol: string;
  position: 'before' | 'after';
  decimalPlaces: number;
  thousandsSeparator: string;
  decimalSeparator: string;
}

// Default settings for supermarket retail currency
const DEFAULT_CURRENCY_SETTINGS: BusinessCurrencySettings = {
  currency: 'USD',
  locale: 'en-US',
  symbol: '$',
  position: 'before',
  decimalPlaces: 2,
  thousandsSeparator: ',',
  decimalSeparator: '.',
};

// Business currency settings (can be overridden by actual business config)
let businessCurrencySettings: BusinessCurrencySettings = { ...DEFAULT_CURRENCY_SETTINGS };

/**
 * Updates business currency settings for formatting
 */
export const updateBusinessCurrencySettings = (settings: Partial<BusinessCurrencySettings>): void => {
  businessCurrencySettings = { ...businessCurrencySettings, ...settings };
};

/**
 * Gets current business currency settings
 */
export const getBusinessCurrencySettings = (): BusinessCurrencySettings => {
  return { ...businessCurrencySettings };
};

/**
 * Convert a price value (string or number) to a number
 * PostgreSQL numeric fields come back as strings in JavaScript
 */
export function parsePrice(price: string | number | null | undefined): number {
  if (price === null || price === undefined) return 0;
  if (typeof price === 'number') return isNaN(price) ? 0 : price;
  if (typeof price === 'string') {
    const cleaned = price.replace(/[^0-9.-]+/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Core currency formatting function with business context
 * Enhanced with consistent decimal precision and robust error handling
 */
export function formatCurrency(
  amount: string | number | null | undefined,
  options: CurrencyFormatOptions = {}
): string {
  const numericAmount = parsePrice(amount);
  
  const {
    currency = businessCurrencySettings.currency,
    locale = businessCurrencySettings.locale,
    showSymbol = true,
    showCurrencyCode = false,
    minimumFractionDigits = businessCurrencySettings.decimalPlaces,
    maximumFractionDigits = businessCurrencySettings.decimalPlaces,
    useGrouping = true,
  } = options;

  // Ensure consistent decimal precision
  const precisionAdjustedAmount = Math.round(numericAmount * Math.pow(10, maximumFractionDigits)) / Math.pow(10, maximumFractionDigits);

  try {
    // Validate currency code
    if (currency && currency.length !== 3) {
      console.warn(`Invalid currency code: ${currency}, using default`);
    }

    // Use Intl.NumberFormat for proper currency formatting
    const formatter = new Intl.NumberFormat(locale, {
      style: showSymbol ? 'currency' : 'decimal',
      currency: currency,
      minimumFractionDigits,
      maximumFractionDigits,
      useGrouping,
    });

    let formatted = formatter.format(precisionAdjustedAmount);

    // Add currency code if requested and not already included
    if (showCurrencyCode && !formatted.includes(currency)) {
      formatted = `${formatted} ${currency}`;
    }

    return formatted;
  } catch (error) {
    // Enhanced fallback with error logging
    console.warn('Currency formatting failed, using fallback:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      amount: numericAmount,
      options,
    });
    return formatCurrencyFallback(precisionAdjustedAmount, options);
  }
}

/**
 * Fallback currency formatting when Intl.NumberFormat fails
 * Enhanced with consistent symbol placement and decimal precision
 */
function formatCurrencyFallback(
  amount: number,
  options: CurrencyFormatOptions = {}
): string {
  const {
    showSymbol = true,
    minimumFractionDigits = businessCurrencySettings.decimalPlaces,
    maximumFractionDigits = businessCurrencySettings.decimalPlaces,
    useGrouping = true,
  } = options;

  // Ensure consistent decimal precision
  const decimalPlaces = Math.max(minimumFractionDigits, maximumFractionDigits);
  let formatted = amount.toFixed(decimalPlaces);

  // Add thousands separators if requested
  if (useGrouping) {
    const parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, businessCurrencySettings.thousandsSeparator);
    formatted = parts.join(businessCurrencySettings.decimalSeparator);
  }

  // Add currency symbol with consistent placement
  if (showSymbol) {
    const symbol = businessCurrencySettings.symbol;
    if (businessCurrencySettings.position === 'before') {
      // Add space between symbol and amount for better readability
      formatted = `${symbol}${formatted}`;
    } else {
      // Add space between amount and symbol for better readability
      formatted = `${formatted} ${symbol}`;
    }
  }

  return formatted;
}

/**
 * Format a price for display (standard price formatting)
 * Uses business currency settings
 */
export function formatPrice(price: string | number | null | undefined): string {
  return formatCurrency(price, {
    showSymbol: true,
    showCurrencyCode: false,
  });
}

/**
 * Format a total amount (emphasizes the total nature)
 * Uses enhanced formatting for totals
 */
export function formatTotal(amount: string | number | null | undefined): string {
  return formatCurrency(amount, {
    showSymbol: true,
    showCurrencyCode: false,
    useGrouping: true,
  });
}

/**
 * Format zero amounts consistently
 * Always shows as currency with proper zero formatting
 * Ensures consistent display across all contexts
 */
export function formatZeroAmount(): string {
  return formatCurrency(0, {
    showSymbol: true,
    showCurrencyCode: false,
    minimumFractionDigits: businessCurrencySettings.decimalPlaces,
    maximumFractionDigits: businessCurrencySettings.decimalPlaces,
  });
}

/**
 * Format price without currency symbol (for calculations display)
 */
export function formatPriceNumeric(price: string | number | null | undefined): string {
  return formatCurrency(price, {
    showSymbol: false,
    showCurrencyCode: false,
    useGrouping: true,
  });
}

/**
 * Format price with currency code (for international display)
 */
export function formatPriceWithCode(price: string | number | null | undefined): string {
  return formatCurrency(price, {
    showSymbol: true,
    showCurrencyCode: true,
  });
}

/**
 * Format price for compact display (minimal formatting)
 */
export function formatPriceCompact(price: string | number | null | undefined): string {
  const numericAmount = parsePrice(price);
  
  // For very large amounts, use compact notation
  if (numericAmount >= 1000000) {
    return formatCurrency(numericAmount / 1000000, {
      maximumFractionDigits: 1,
      useGrouping: false,
    }) + 'M';
  } else if (numericAmount >= 1000) {
    return formatCurrency(numericAmount / 1000, {
      maximumFractionDigits: 1,
      useGrouping: false,
    }) + 'K';
  }
  
  return formatPrice(price);
}

/**
 * Format price for input fields (no symbol, proper decimal handling)
 */
export function formatPriceForInput(price: string | number | null | undefined): string {
  const numericAmount = parsePrice(price);
  return numericAmount.toFixed(businessCurrencySettings.decimalPlaces);
}

/**
 * Parse and validate price input from user
 */
export function parsePriceInput(input: string): { value: number; isValid: boolean; error?: string } {
  if (!input || input.trim() === '') {
    return { value: 0, isValid: false, error: 'Price is required' };
  }

  // Remove currency symbols and separators for parsing
  const cleanInput = input
    .replace(new RegExp(`\\${businessCurrencySettings.symbol}`, 'g'), '')
    .replace(new RegExp(`\\${businessCurrencySettings.thousandsSeparator}`, 'g'), '')
    .replace(new RegExp(`\\${businessCurrencySettings.decimalSeparator}`, 'g'), '.')
    .trim();

  const parsed = parseFloat(cleanInput);
  
  if (isNaN(parsed)) {
    return { value: 0, isValid: false, error: 'Invalid price format' };
  }

  if (parsed < 0) {
    return { value: 0, isValid: false, error: 'Price cannot be negative' };
  }

  // Check for reasonable maximum (adjust as needed)
  if (parsed > 999999999) {
    return { value: 0, isValid: false, error: 'Price is too large' };
  }

  return { value: parsed, isValid: true };
}

/**
 * Calculate percentage and format as currency
 */
export function formatPercentageOfAmount(
  amount: string | number | null | undefined,
  percentage: number
): string {
  const numericAmount = parsePrice(amount);
  const result = (numericAmount * percentage) / 100;
  return formatPrice(result);
}

/**
 * Format discount amount
 */
export function formatDiscount(
  originalAmount: string | number | null | undefined,
  discountAmount: string | number | null | undefined
): string {
  const discount = parsePrice(discountAmount);
  if (discount === 0) return '';
  
  return `-${formatPrice(discount)}`;
}

/**
 * Convert a numeric database value (like quantity, stock level) to integer
 */
export function parseInteger(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Math.floor(value);
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Convert a decimal database value to float
 */
export function parseDecimal(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Format quantity with proper units
 */
export function formatQuantity(quantity: string | number | null | undefined, unit?: string): string {
  const numericQuantity = parseInteger(quantity);
  const formattedQuantity = numericQuantity.toLocaleString(businessCurrencySettings.locale);
  
  if (unit) {
    return `${formattedQuantity} ${unit}`;
  }
  
  return formattedQuantity;
}

/**
 * Calculate and format tax amount
 */
export function formatTaxAmount(
  amount: string | number | null | undefined,
  taxRate: number
): string {
  const numericAmount = parsePrice(amount);
  const taxAmount = (numericAmount * taxRate) / 100;
  return formatPrice(taxAmount);
}

/**
 * Format price range (min - max)
 */
export function formatPriceRange(
  minPrice: string | number | null | undefined,
  maxPrice: string | number | null | undefined
): string {
  const min = parsePrice(minPrice);
  const max = parsePrice(maxPrice);
  
  if (min === max) {
    return formatPrice(min);
  }
  
  return `${formatPrice(min)} - ${formatPrice(max)}`;
}

// Currency conversion utilities (Requirement 6.5)

export interface CurrencyConversionRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  lastUpdated: Date;
}

export interface CurrencyConversionOptions {
  fromCurrency?: string;
  toCurrency?: string;
  rate?: number;
  roundingMode?: 'round' | 'floor' | 'ceil';
}

/**
 * Convert amount from one currency to another
 * Uses provided rate or fetches from conversion service
 */
export function convertCurrency(
  amount: string | number | null | undefined,
  options: CurrencyConversionOptions
): { convertedAmount: number; formattedAmount: string; isValid: boolean; error?: string } {
  const numericAmount = parsePrice(amount);
  
  if (numericAmount === 0) {
    return {
      convertedAmount: 0,
      formattedAmount: formatZeroAmount(),
      isValid: true,
    };
  }

  const {
    fromCurrency = businessCurrencySettings.currency,
    toCurrency = businessCurrencySettings.currency,
    rate,
    roundingMode = 'round',
  } = options;

  // If same currency, no conversion needed
  if (fromCurrency === toCurrency) {
    return {
      convertedAmount: numericAmount,
      formattedAmount: formatPrice(numericAmount),
      isValid: true,
    };
  }

  // Validate conversion rate
  if (!rate || rate <= 0) {
    return {
      convertedAmount: 0,
      formattedAmount: formatZeroAmount(),
      isValid: false,
      error: 'Invalid conversion rate provided',
    };
  }

  // Perform conversion
  let convertedAmount = numericAmount * rate;

  // Apply rounding mode
  switch (roundingMode) {
    case 'floor':
      convertedAmount = Math.floor(convertedAmount * 100) / 100;
      break;
    case 'ceil':
      convertedAmount = Math.ceil(convertedAmount * 100) / 100;
      break;
    case 'round':
    default:
      convertedAmount = Math.round(convertedAmount * 100) / 100;
      break;
  }

  return {
    convertedAmount,
    formattedAmount: formatCurrency(convertedAmount, {
      currency: toCurrency,
      showSymbol: true,
    }),
    isValid: true,
  };
}

/**
 * Format amount with currency conversion display
 * Shows both original and converted amounts
 */
export function formatCurrencyWithConversion(
  amount: string | number | null | undefined,
  conversionOptions: CurrencyConversionOptions
): string {
  const originalFormatted = formatPrice(amount);
  const conversion = convertCurrency(amount, conversionOptions);
  
  if (!conversion.isValid || conversion.convertedAmount === parsePrice(amount)) {
    return originalFormatted;
  }
  
  return `${originalFormatted} (${conversion.formattedAmount})`;
}

/**
 * Enhanced business context-aware formatting with validation
 * Ensures consistent decimal precision and symbol placement
 */
export function formatCurrencyEnhanced(
  amount: string | number | null | undefined,
  options: CurrencyFormatOptions = {}
): { formattedAmount: string; isValid: boolean; error?: string } {
  try {
    const numericAmount = parsePrice(amount);
    
    // Validate amount is within reasonable bounds
    if (numericAmount < 0) {
      return {
        formattedAmount: formatZeroAmount(),
        isValid: false,
        error: 'Amount cannot be negative',
      };
    }
    
    if (numericAmount > 999999999999) {
      return {
        formattedAmount: formatZeroAmount(),
        isValid: false,
        error: 'Amount exceeds maximum allowed value',
      };
    }

    const formattedAmount = formatCurrency(amount, {
      ...options,
      minimumFractionDigits: options.minimumFractionDigits ?? businessCurrencySettings.decimalPlaces,
      maximumFractionDigits: options.maximumFractionDigits ?? businessCurrencySettings.decimalPlaces,
    });

    return {
      formattedAmount,
      isValid: true,
    };
  } catch (error) {
    return {
      formattedAmount: formatZeroAmount(),
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown formatting error',
    };
  }
}

/**
 * Format currency for different business contexts
 */
export function formatCurrencyForContext(
  amount: string | number | null | undefined,
  context: 'display' | 'receipt' | 'report' | 'input' | 'api'
): string {
  const numericAmount = parsePrice(amount);
  
  switch (context) {
    case 'display':
      return formatPrice(amount);
    
    case 'receipt':
      return formatCurrency(amount, {
        showSymbol: true,
        useGrouping: true,
        minimumFractionDigits: businessCurrencySettings.decimalPlaces,
        maximumFractionDigits: businessCurrencySettings.decimalPlaces,
      });
    
    case 'report':
      return formatCurrency(amount, {
        showSymbol: true,
        showCurrencyCode: true,
        useGrouping: true,
      });
    
    case 'input':
      return formatPriceForInput(amount);
    
    case 'api':
      return numericAmount.toFixed(businessCurrencySettings.decimalPlaces);
    
    default:
      return formatPrice(amount);
  }
}

/**
 * Format currency with enhanced precision control
 * Useful for financial calculations requiring specific precision
 */
export function formatCurrencyPrecise(
  amount: string | number | null | undefined,
  decimalPlaces: number = businessCurrencySettings.decimalPlaces
): string {
  return formatCurrency(amount, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
    useGrouping: true,
  });
}

/**
 * Format currency for table displays (consistent width)
 * Ensures consistent alignment in tabular data
 */
export function formatCurrencyTable(
  amount: string | number | null | undefined,
  options: { width?: number; align?: 'left' | 'right' } = {}
): string {
  const formatted = formatPrice(amount);
  const { width, align = 'right' } = options;
  
  if (!width) return formatted;
  
  if (align === 'right') {
    return formatted.padStart(width);
  } else {
    return formatted.padEnd(width);
  }
}

/**
 * Format currency with change indicator (+ or -)
 * Useful for showing profit/loss or changes
 */
export function formatCurrencyChange(
  amount: string | number | null | undefined,
  options: { showPositiveSign?: boolean; colorCoding?: boolean } = {}
): string {
  const numericAmount = parsePrice(amount);
  const { showPositiveSign = true } = options;
  
  let formatted = formatPrice(Math.abs(numericAmount));
  
  if (numericAmount > 0 && showPositiveSign) {
    formatted = `+${formatted}`;
  } else if (numericAmount < 0) {
    formatted = `-${formatted}`;
  }
  
  return formatted;
}

/**
 * Validate and format currency input with detailed feedback
 * Returns both formatted value and validation status
 */
export function validateAndFormatCurrency(
  input: string | number | null | undefined
): {
  formatted: string;
  numericValue: number;
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (input === null || input === undefined || input === '') {
    return {
      formatted: formatZeroAmount(),
      numericValue: 0,
      isValid: false,
      errors: ['Amount is required'],
      warnings: [],
    };
  }
  
  const parseResult = parsePriceInput(String(input));
  
  if (!parseResult.isValid) {
    errors.push(parseResult.error || 'Invalid amount format');
  }
  
  const numericValue = parseResult.value;
  
  // Additional business validations
  if (numericValue < 0) {
    errors.push('Amount cannot be negative');
  }
  
  if (numericValue > 999999999) {
    errors.push('Amount exceeds maximum allowed value');
  }
  
  if (numericValue > 0 && numericValue < 0.01) {
    warnings.push('Amount is very small and may cause precision issues');
  }
  
  const formatted = errors.length === 0 ? formatPrice(numericValue) : formatZeroAmount();
  
  return {
    formatted,
    numericValue,
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}