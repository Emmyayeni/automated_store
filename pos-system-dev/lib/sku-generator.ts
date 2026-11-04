import { db } from "./db";
import { products } from "./schema";
import { eq, and, sql } from "drizzle-orm";

export interface SKUConfig {
  businessId: string;
  category?: string;
  productName?: string;
  prefix?: string;
}

/**
 * Generate a unique SKU for a product
 * Format: [PREFIX]-[CATEGORY_CODE]-[SEQUENCE]
 * Example: PRD-ELC-001, PRD-FOD-002, etc.
 */
export async function generateSKU(config: SKUConfig): Promise<string> {
  const { businessId, category, productName, prefix = 'PRD' } = config;
  
  // Generate category code (3 letters from category name or 'GEN' for general)
  const categoryCode = category 
    ? category.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 3).padEnd(3, 'X')
    : 'GEN';
  
  // Get the next sequence number for this business and category
  const sequenceResult = await db
    .select({
      count: sql<number>`COUNT(*)`
    })
    .from(products)
    .where(
      and(
        eq(products.businessId, businessId),
        sql`${products.sku} LIKE ${`${prefix}-${categoryCode}-%`}`
      )
    );
  
  const nextSequence = (sequenceResult[0]?.count || 0) + 1;
  const sequenceStr = nextSequence.toString().padStart(3, '0');
  
  const generatedSKU = `${prefix}-${categoryCode}-${sequenceStr}`;
  
  // Check if this SKU already exists (rare but possible)
  const existingProduct = await db
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        eq(products.businessId, businessId),
        eq(products.sku, generatedSKU)
      )
    )
    .limit(1);
  
  if (existingProduct.length > 0) {
    // If collision occurs, try with next sequence number
    return generateSKU({
      ...config,
      prefix: `${prefix}-${Date.now().toString().slice(-3)}`
    });
  }
  
  return generatedSKU;
}

/**
 * Generate a barcode if one is not provided
 * Uses EAN-13 format: 13 digits
 */
export function generateBarcode(businessId: string, productName: string): string {
  // Create a hash based on business ID and product name
  const hash = Array.from(businessId + productName)
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Generate 12 digits from the hash and timestamp
  const timestamp = Date.now().toString().slice(-6);
  const hashStr = hash.toString().slice(-6);
  const baseCode = (timestamp + hashStr).padStart(12, '0').slice(-12);
  
  // Calculate EAN-13 check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(baseCode[i]);
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  
  return baseCode + checkDigit;
}

/**
 * Validate and format a barcode
 */
export function validateBarcode(barcode: string): { isValid: boolean; formatted: string; type?: string } {
  // Remove non-digits
  const cleaned = barcode.replace(/\D/g, '');
  
  // Check for common barcode formats
  if (cleaned.length === 8) {
    // EAN-8
    return { isValid: true, formatted: cleaned, type: 'EAN-8' };
  } else if (cleaned.length === 12) {
    // UPC-A
    return { isValid: true, formatted: cleaned, type: 'UPC-A' };
  } else if (cleaned.length === 13) {
    // EAN-13
    return { isValid: true, formatted: cleaned, type: 'EAN-13' };
  } else if (cleaned.length >= 6 && cleaned.length <= 14) {
    // Custom format - pad or truncate to 13 digits
    const formatted = cleaned.padStart(13, '0').slice(-13);
    return { isValid: true, formatted, type: 'Custom' };
  }
  
  return { isValid: false, formatted: barcode };
}
