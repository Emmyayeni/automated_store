// Sierra Leone specific configurations
export const SIERRA_LEONE_CONFIG = {
  currency: {
    code: 'SLL',
    symbol: 'Le',
    name: 'Sierra Leone Leone',
    position: 'before', // Le 1,000.00
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    minorUnit: 100, // 100 cents = 1 leone
    denominations: {
      notes: [10000, 5000, 2000, 1000, 500],
      coins: [500, 100, 50, 10, 1]
    }
  },
  
  taxation: {
    gst: 0.15, // 15% GST in Sierra Leone
    withholding_tax: 0.05, // 5% withholding tax for businesses
  },
  
  pharmacy: {
    // Sierra Leone Pharmacy Board regulations
    controlled_substance_schedules: [
      'Schedule I',
      'Schedule II', 
      'Schedule III',
      'Schedule IV',
      'Schedule V'
    ],
    
    drug_categories: [
      'Prescription Medicines',
      'Over-the-Counter Medicines',
      'Traditional Medicines',
      'Medical Devices',
      'Personal Care Products',
      'Nutritional Supplements'
    ],
    
    storage_requirements: {
      'room_temperature': '15-30°C',
      'refrigerated': '2-8°C', 
      'frozen': '-20°C or below',
      'controlled_room': '20-25°C with humidity control'
    },
    
    expiry_warning_days: {
      critical: 7,    // Red alert
      warning: 30,    // Orange alert  
      caution: 90     // Yellow alert
    },
    
    prescription_requirements: {
      min_doctor_license_length: 6,
      prescription_validity_days: 30,
      controlled_substance_validity_days: 7,
    }
  },
  
  business: {
    operating_hours: {
      start: '08:00',
      end: '20:00',
      timezone: 'Africa/Freetown'
    },
    
    emergency_contacts: {
      pharmacy_board: '+232-XX-XXXXXX',
      health_ministry: '+232-XX-XXXXXX',
      poison_control: '+232-XX-XXXXXX'
    }
  },
  
  localization: {
    date_format: 'DD/MM/YYYY',
    time_format: '24h',
    language: 'en-SL', // English (Sierra Leone)
    first_day_of_week: 1, // Monday
  }
}

// Utility functions for Sierra Leone specific formatting
export const formatSLLCurrency = (amount: number, options?: {
  showSymbol?: boolean;
  compact?: boolean;
  precision?: number;
}): string => {
  const { symbol, position, decimals, thousandsSeparator, decimalSeparator } = SIERRA_LEONE_CONFIG.currency
  const { showSymbol = true, compact = false, precision = decimals } = options || {}
  
  // For large amounts, use compact notation
  if (compact && amount >= 1000000) {
    const millions = amount / 1000000
    const formatted = millions.toFixed(1) + 'M'
    return showSymbol ? (position === 'before' ? `${symbol} ${formatted}` : `${formatted} ${symbol}`) : formatted
  }
  
  if (compact && amount >= 1000) {
    const thousands = amount / 1000
    const formatted = thousands.toFixed(1) + 'K'
    return showSymbol ? (position === 'before' ? `${symbol} ${formatted}` : `${formatted} ${symbol}`) : formatted
  }
  
  const formatted = amount.toFixed(precision)
    .replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator)
    .replace('.', decimalSeparator)
  
  if (!showSymbol) return formatted
  return position === 'before' ? `${symbol} ${formatted}` : `${formatted} ${symbol}`
}

// Parse SLL currency string back to number
export const parseSLLCurrency = (currencyString: string): number => {
  const { symbol, thousandsSeparator, decimalSeparator } = SIERRA_LEONE_CONFIG.currency
  
  let cleaned = currencyString
    .replace(new RegExp(`\\${symbol}`, 'g'), '')
    .replace(/\s/g, '')
    .replace(new RegExp(`\\${thousandsSeparator}`, 'g'), '')
    .replace(decimalSeparator, '.')
  
  return parseFloat(cleaned) || 0
}

export const calculateSLLTax = (amount: number, includeGST: boolean = true): { 
  subtotal: number, 
  gst: number, 
  total: number 
} => {
  const gstRate = SIERRA_LEONE_CONFIG.taxation.gst
  
  if (includeGST) {
    const subtotal = amount
    const gst = subtotal * gstRate
    const total = subtotal + gst
    
    return { subtotal, gst, total }
  } else {
    return { subtotal: amount, gst: 0, total: amount }
  }
}

export const isControlledSubstance = (schedule?: string): boolean => {
  if (!schedule) return false
  return SIERRA_LEONE_CONFIG.pharmacy.controlled_substance_schedules.includes(schedule)
}

export const getExpiryAlertLevel = (daysUntilExpiry: number): 'critical' | 'warning' | 'caution' | 'normal' => {
  const { critical, warning, caution } = SIERRA_LEONE_CONFIG.pharmacy.expiry_warning_days
  
  if (daysUntilExpiry < 0) return 'critical' // Already expired
  if (daysUntilExpiry <= critical) return 'critical'
  if (daysUntilExpiry <= warning) return 'warning'
  if (daysUntilExpiry <= caution) return 'caution'
  return 'normal'
}

export const validateSierraLeonePhoneNumber = (phone: string): boolean => {
  // Sierra Leone phone number validation
  // Format: +232XXXXXXXX or 0XXXXXXXX
  const sllPhoneRegex = /^(\+232|0)[0-9]{8}$/
  return sllPhoneRegex.test(phone.replace(/\s/g, ''))
}

export const formatSierraLeoneDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('en-SL', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  })
}

export const formatSierraLeoneDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleString('en-SL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}
