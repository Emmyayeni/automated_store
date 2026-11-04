/**
 * Standardized formatting utilities for dates, times, and currency
 * Provides consistent formatting across the HARDYPOS application
 */

// Date formatting interfaces and types
export interface DateFormatOptions {
    locale?: string;
    timezone?: string;
    includeTime?: boolean;
    dateStyle?: 'full' | 'long' | 'medium' | 'short';
    timeStyle?: 'full' | 'long' | 'medium' | 'short';
}

export interface BusinessLocationSettings {
    timezone: string;
    locale: string;
    currency: string;
}

// Default settings for Sierra Leone
const DEFAULT_LOCALE = 'en-SL';
const DEFAULT_TIMEZONE = 'Africa/Freetown';
const DEFAULT_CURRENCY = 'SLL';

// Business location settings (can be overridden by actual business config)
let businessSettings: BusinessLocationSettings = {
    timezone: DEFAULT_TIMEZONE,
    locale: DEFAULT_LOCALE,
    currency: DEFAULT_CURRENCY,
};

/**
 * Updates business location settings for formatting
 */
export const updateBusinessSettings = (settings: Partial<BusinessLocationSettings>): void => {
    businessSettings = { ...businessSettings, ...settings };
};

/**
 * Gets current business settings
 */
export const getBusinessSettings = (): BusinessLocationSettings => {
    return { ...businessSettings };
};

/**
 * Validates and normalizes date input
 */
const normalizeDate = (date: Date | string | number | null | undefined): Date | null => {
    if (!date) return null;

    if (date instanceof Date) {
        return isNaN(date.getTime()) ? null : date;
    }

    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? null : parsed;
};
/**

 * Core date formatting function with timezone and locale support
 */
export const formatDate = (
    date: Date | string | number | null | undefined,
    options: DateFormatOptions = {}
): string => {
    const normalizedDate = normalizeDate(date);
    if (!normalizedDate) return '';

    const {
        locale = businessSettings.locale,
        timezone = businessSettings.timezone,
        includeTime = false,
        dateStyle = 'medium',
        timeStyle = 'short'
    } = options;

    try {
        const formatOptions: Intl.DateTimeFormatOptions = {
            timeZone: timezone,
        };

        if (includeTime) {
            formatOptions.dateStyle = dateStyle;
            formatOptions.timeStyle = timeStyle;
        } else {
            formatOptions.dateStyle = dateStyle;
        }

        return new Intl.DateTimeFormat(locale, formatOptions).format(normalizedDate);
    } catch (error) {
        // Fallback to basic formatting if Intl fails
        console.warn('Date formatting failed, using fallback:', error);
        return normalizedDate.toLocaleDateString(DEFAULT_LOCALE);
    }
};

/**
 * Formats date for display in UI components (no time)
 * Example: "Dec 15, 2023"
 */
export const formatDisplayDate = (date: Date | string | number | null | undefined): string => {
    return formatDate(date, {
        dateStyle: 'medium',
        includeTime: false,
    });
};

/**
 * Formats date and time for display in UI components
 * Example: "Dec 15, 2023, 2:30 PM"
 */
export const formatDisplayDateTime = (date: Date | string | number | null | undefined): string => {
    return formatDate(date, {
        dateStyle: 'medium',
        timeStyle: 'short',
        includeTime: true,
    });
};/**
 * Form
ats date for API responses and storage (ISO format)
 * Example: "2023-12-15T14:30:00.000Z"
 */
export const formatApiDate = (date: Date | string | number | null | undefined): string => {
    const normalizedDate = normalizeDate(date);
    if (!normalizedDate) return '';

    return normalizedDate.toISOString();
};

/**
 * Formats date for short display (compact format)
 * Example: "12/15/23"
 */
export const formatShortDate = (date: Date | string | number | null | undefined): string => {
    return formatDate(date, {
        dateStyle: 'short',
        includeTime: false,
    });
};

/**
 * Formats date for long display (full format)
 * Example: "Friday, December 15, 2023"
 */
export const formatLongDate = (date: Date | string | number | null | undefined): string => {
    return formatDate(date, {
        dateStyle: 'full',
        includeTime: false,
    });
};

/**
 * Formats time only (no date)
 * Example: "2:30 PM"
 */
export const formatTime = (date: Date | string | number | null | undefined): string => {
    const normalizedDate = normalizeDate(date);
    if (!normalizedDate) return '';

    try {
        return new Intl.DateTimeFormat(businessSettings.locale, {
            timeZone: businessSettings.timezone,
            timeStyle: 'short',
        }).format(normalizedDate);
    } catch (error) {
        console.warn('Time formatting failed, using fallback:', error);
        return normalizedDate.toLocaleTimeString(DEFAULT_LOCALE, {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
};/**
 * Fo
rmats date relative to now (e.g., "2 hours ago", "yesterday")
 */
export const formatRelativeDate = (date: Date | string | number | null | undefined): string => {
    const normalizedDate = normalizeDate(date);
    if (!normalizedDate) return '';

    try {
        const rtf = new Intl.RelativeTimeFormat(businessSettings.locale, { numeric: 'auto' });
        const now = new Date();
        const diffInSeconds = Math.floor((normalizedDate.getTime() - now.getTime()) / 1000);

        // Define time units in seconds
        const units: Array<[string, number]> = [
            ['year', 31536000],
            ['month', 2592000],
            ['day', 86400],
            ['hour', 3600],
            ['minute', 60],
            ['second', 1],
        ];

        for (const [unit, secondsInUnit] of units) {
            const value = Math.floor(Math.abs(diffInSeconds) / secondsInUnit);
            if (value >= 1) {
                return rtf.format(diffInSeconds < 0 ? -value : value, unit as Intl.RelativeTimeFormatUnit);
            }
        }

        return rtf.format(0, 'second');
    } catch (error) {
        console.warn('Relative date formatting failed, using fallback:', error);
        return formatDisplayDate(normalizedDate);
    }
};

/**
 * Checks if a date is today
 */
export const isToday = (date: Date | string | number | null | undefined): boolean => {
    const normalizedDate = normalizeDate(date);
    if (!normalizedDate) return false;

    const today = new Date();
    return (
        normalizedDate.getDate() === today.getDate() &&
        normalizedDate.getMonth() === today.getMonth() &&
        normalizedDate.getFullYear() === today.getFullYear()
    );
};/**

 * Checks if a date is yesterday
 */
export const isYesterday = (date: Date | string | number | null | undefined): boolean => {
    const normalizedDate = normalizeDate(date);
    if (!normalizedDate) return false;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return (
        normalizedDate.getDate() === yesterday.getDate() &&
        normalizedDate.getMonth() === yesterday.getMonth() &&
        normalizedDate.getFullYear() === yesterday.getFullYear()
    );
};

/**
 * Formats date with context-aware display
 * Shows "Today", "Yesterday", or formatted date
 */
export const formatContextualDate = (date: Date | string | number | null | undefined): string => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return formatDisplayDate(date);
};

// Re-export currency formatting utilities for centralized access
export {
    formatCurrency,
    formatPrice,
    formatTotal,
    formatZeroAmount,
    formatPriceNumeric,
    formatPriceWithCode,
    formatPriceCompact,
    formatPriceForInput,
    formatPercentageOfAmount,
    formatDiscount,
    formatQuantity,
    formatTaxAmount,
    formatPriceRange,
    parsePriceInput,
    updateBusinessCurrencySettings,
    getBusinessCurrencySettings,
    type CurrencyFormatOptions,
    type BusinessCurrencySettings,
} from '../price-utils';/**
 *
 Unified business settings update function
 * Updates both date and currency settings
 */
export const updateAllBusinessSettings = (settings: {
    timezone?: string;
    locale?: string;
    currency?: string;
    currencySymbol?: string;
    currencyPosition?: 'before' | 'after';
    decimalPlaces?: number;
}): void => {
    // Update settings
    updateBusinessSettings({
        ...(settings.timezone ? { timezone: settings.timezone } : {}),
        ...(settings.locale ? { locale: settings.locale } : {}),
        ...(settings.currency ? { currency: settings.currency } : {}),
    });
};

/**
 * Get all business formatting settings
 */
export const getAllBusinessSettings = () => {
    return {
        date: getBusinessSettings(),
        currency: getBusinessSettings(),
    };
};