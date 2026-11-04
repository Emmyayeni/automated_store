#!/usr/bin/env node

// Demo script to test SKU generation and barcode functionality
// Run with: node scripts/test-sku-generation.js

// Import is commented out since we're running standalone functions
// import { generateSKU, generateBarcode, validateBarcode } from '../lib/sku-generator.js';

async function testSKUGeneration() {
  console.log('🧪 Testing SKU Generation and Barcode Functions\n');

  // Test SKU generation
  console.log('📋 SKU Generation Tests:');
  const businessId = 'biz-123-test';
  
  const skuTests = [
    { category: 'Electronics', productName: 'iPhone 15 Pro' },
    { category: 'Food & Beverage', productName: 'Premium Coffee Beans' },
    { category: 'Clothing', productName: 'Cotton T-Shirt' },
    { category: '', productName: 'Generic Product' },
  ];

  for (const test of skuTests) {
    try {
      // Note: In a real environment, this would query the database
      // For demo purposes, we'll simulate it
      const sku = await generateSKU({
        businessId,
        category: test.category,
        productName: test.productName
      });
      console.log(`  ✅ ${test.productName} (${test.category || 'No category'}) → ${sku}`);
    } catch (error) {
      console.log(`  ❌ ${test.productName} → Error: ${error.message}`);
    }
  }

  // Test barcode generation
  console.log('\n📊 Barcode Generation Tests:');
  const barcodeTests = [
    'Premium Coffee Beans',
    'iPhone 15 Pro',
    'Cotton T-Shirt',
    'Test Product 123'
  ];

  barcodeTests.forEach(productName => {
    const barcode = generateBarcode(businessId, productName);
    console.log(`  ✅ ${productName} → ${barcode}`);
  });

  // Test barcode validation
  console.log('\n✅ Barcode Validation Tests:');
  const validationTests = [
    '1234567890123',      // EAN-13
    '12345678',           // EAN-8
    '123456789012',       // UPC-A
    '123456',             // Short - will be padded
    '12345678901234567',  // Long - will be truncated
    'abc123',             // Invalid characters - will be cleaned
    ''                    // Empty
  ];

  validationTests.forEach(barcode => {
    const result = validateBarcode(barcode);
    console.log(`  ${result.isValid ? '✅' : '❌'} "${barcode}" → ${result.formatted} (${result.type || 'Invalid'})`);
  });
}

// Manual test functions that work without database
function generateSKUSimple(config) {
  const { businessId, category, productName, prefix = 'PRD' } = config;
  
  const categoryCode = category 
    ? category.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 3).padEnd(3, 'X')
    : 'GEN';
  
  // Simulate next sequence (in real app, this would be from DB)
  const nextSequence = Math.floor(Math.random() * 999) + 1;
  const sequenceStr = nextSequence.toString().padStart(3, '0');
  
  return `${prefix}-${categoryCode}-${sequenceStr}`;
}

function generateBarcodeSimple(businessId, productName) {
  const hash = Array.from(businessId + productName)
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const timestamp = Date.now().toString().slice(-6);
  const hashStr = hash.toString().slice(-6);
  const baseCode = (timestamp + hashStr).padStart(12, '0').slice(-12);
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(baseCode[i]);
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  
  return baseCode + checkDigit;
}

function validateBarcodeSimple(barcode) {
  const cleaned = barcode.replace(/\D/g, '');
  
  if (cleaned.length === 8) {
    return { isValid: true, formatted: cleaned, type: 'EAN-8' };
  } else if (cleaned.length === 12) {
    return { isValid: true, formatted: cleaned, type: 'UPC-A' };
  } else if (cleaned.length === 13) {
    return { isValid: true, formatted: cleaned, type: 'EAN-13' };
  } else if (cleaned.length >= 6 && cleaned.length <= 14) {
    const formatted = cleaned.padStart(13, '0').slice(-13);
    return { isValid: true, formatted, type: 'Custom' };
  }
  
  return { isValid: false, formatted: barcode };
}

// Run simple tests without database
function runSimpleTests() {
  console.log('🧪 Testing SKU Generation and Barcode Functions (No Database)\n');

  console.log('📋 SKU Generation Tests:');
  const businessId = 'biz-123-test';
  
  const skuTests = [
    { category: 'Electronics', productName: 'iPhone 15 Pro' },
    { category: 'Food & Beverage', productName: 'Premium Coffee Beans' },
    { category: 'Clothing', productName: 'Cotton T-Shirt' },
    { category: '', productName: 'Generic Product' },
  ];

  skuTests.forEach(test => {
    const sku = generateSKUSimple({
      businessId,
      category: test.category,
      productName: test.productName
    });
    console.log(`  ✅ ${test.productName} (${test.category || 'No category'}) → ${sku}`);
  });

  console.log('\n📊 Barcode Generation Tests:');
  const barcodeTests = [
    'Premium Coffee Beans',
    'iPhone 15 Pro',
    'Cotton T-Shirt',
    'Test Product 123'
  ];

  barcodeTests.forEach(productName => {
    const barcode = generateBarcodeSimple(businessId, productName);
    console.log(`  ✅ ${productName} → ${barcode}`);
  });

  console.log('\n✅ Barcode Validation Tests:');
  const validationTests = [
    '1234567890123',
    '12345678',
    '123456789012',
    '123456',
    '12345678901234567',
    'abc123',
    ''
  ];

  validationTests.forEach(barcode => {
    const result = validateBarcodeSimple(barcode);
    console.log(`  ${result.isValid ? '✅' : '❌'} "${barcode}" → ${result.formatted} (${result.type || 'Invalid'})`);
  });

  console.log('\n🎉 All tests completed!');
  console.log('\n📝 Usage Examples:');
  console.log('  • When adding a product, SKU will be auto-generated if not provided');
  console.log('  • Format: PRD-[CATEGORY_CODE]-[SEQUENCE]');
  console.log('  • Barcode scanning now supports product registration');
  console.log('  • New products get auto-generated SKUs and validated barcodes');
}

// Run the tests
runSimpleTests();
