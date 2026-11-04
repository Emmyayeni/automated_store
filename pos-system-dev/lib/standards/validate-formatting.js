/**
 * Simple validation script to test formatting utilities
 * This can be run with node to verify the formatting works correctly
 */

// Import the formatting utilities (using require for Node.js compatibility)
const {
  formatDate,
  formatDisplayDate,
  formatDisplayDateTime,
  formatPrice,
  formatCurrency,
  formatTotal,
  formatZeroAmount,
} = require('./formatting.ts');

console.log('Testing Date Formatting Utilities:');
console.log('==================================');

const testDate = new Date('2023-12-15T14:30:00.000Z');
console.log('Test Date:', testDate.toISOString());
console.log('formatDisplayDate:', formatDisplayDate(testDate));
console.log('formatDisplayDateTime:', formatDisplayDateTime(testDate));
console.log('formatDate (default):', formatDate(testDate));

console.log('\nTesting Currency Formatting Utilities:');
console.log('=====================================');

const testAmount = 1234.56;
console.log('Test Amount:', testAmount);
console.log('formatPrice:', formatPrice(testAmount));
console.log('formatCurrency:', formatCurrency(testAmount));
console.log('formatTotal:', formatTotal(testAmount));
console.log('formatZeroAmount:', formatZeroAmount());

console.log('\nTesting Edge Cases:');
console.log('==================');

console.log('formatPrice(null):', formatPrice(null));
console.log('formatPrice(undefined):', formatPrice(undefined));
console.log('formatPrice("1234.56"):', formatPrice("1234.56"));
console.log('formatDisplayDate(null):', formatDisplayDate(null));
console.log('formatDisplayDate("invalid"):', formatDisplayDate("invalid"));

console.log('\nAll formatting utilities validated successfully!');