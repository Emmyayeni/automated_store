// API Integration: Required endpoints for pharmacy functionality

// 1. Enhanced Products API (extends existing /api/products)
// GET /api/admin/products?businessId={id}
// - Returns products with pharmacy fields
// - Filters by drugType, storage conditions, expiry status

// POST /api/admin/products
// - Creates products with pharmacy-specific fields
// - Validates prescription requirements, controlled substance schedules

// PUT /api/admin/products/{id}
// - Updates pharmacy product information
// - Handles expiry date changes, batch updates

// 2. Inventory Alerts API (new)
// GET /api/admin/inventory/alerts?businessId={id}
// - Returns current active alerts
// - Filters by alert type, severity, status

// POST /api/admin/inventory/alerts/{id}/acknowledge
// - Marks alert as acknowledged
// - Updates acknowledgedAt timestamp

// POST /api/admin/inventory/alerts/{id}/resolve
// - Marks alert as resolved
// - Sets resolvedAt timestamp, isActive: false

// 3. Alert Settings API (new)
// GET /api/admin/inventory/alert-settings?businessId={id}
// - Returns current alert configuration
// - Expiry thresholds, notification preferences

// POST /api/admin/inventory/alert-settings
// - Updates alert configuration
// - Saves business-specific settings

// 4. FEFO Management API (new)
// GET /api/admin/inventory/fefo?businessId={id}
// - Returns inventory items sorted by expiry date
// - Calculates FEFO rankings, suggested actions
// - Includes batch tracking and location info

// 5. Currency Settings API (new)
// GET /api/admin/settings/currency?businessId={id}
// - Returns current currency configuration
// - SLL formatting, tax rates, regional settings

// POST /api/admin/settings/currency
// - Updates currency and regional settings
// - Saves tax rates, formatting preferences

// Integration with existing APIs:
// ✅ Your existing /api/products works with basic product data
// ✅ Your existing /api/business/{id} provides business context
// ✅ Your session management provides businessId and user roles

// Example API Response Structure:
interface PharmacyProduct {
  // Basic product fields (existing)
  id: string
  businessId: string
  name: string
  price: number
  category: string
  
  // Pharmacy-specific fields (new)
  drugType: 'prescription' | 'otc' | 'controlled'
  drugForm?: 'tablet' | 'capsule' | 'syrup'
  strength?: string
  genericName?: string
  brandName?: string
  manufacturer?: string
  batchNumber?: string
  expiryDate?: string
  storageConditions: 'room_temperature' | 'refrigerated'
  requiresPrescription: boolean
  isControlledSubstance: boolean
  
  // Calculated fields for UI
  daysUntilExpiry?: number
  expiryStatus?: 'good' | 'caution' | 'warning' | 'critical' | 'expired'
}