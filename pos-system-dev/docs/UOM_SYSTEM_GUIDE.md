# Unit of Measure (UOM) Management System

## Overview

The UOM system enables your pharmacy to handle complex packaging hierarchies where products can be sold in different units. For example, a drug that comes in packs containing cards, where each card has strips, and each strip contains individual tablets.

## Key Concepts

### 1. **Base Unit**
- The smallest sellable unit for inventory tracking
- Example: Individual tablet, capsule, ml, etc.
- All inventory calculations are done in base units

### 2. **Conversion Factor** 
- How many base units equal one of the current UOM
- Example: If 1 strip = 10 tablets, conversion factor is 10

### 3. **Packaging Hierarchy**
- Defines relationships between package sizes
- Example: Pack → Card → Strip → Tablet

## Common Pharmacy Scenarios

### Scenario 1: Basic Drug with Multiple Package Sizes

**Product**: Paracetamol 500mg
**Structure**:
- 1 Pack = 3 Cards (60 tablets total)
- 1 Card = 2 Strips (20 tablets total) 
- 1 Strip = 10 Tablets
- Base Unit = Tablet

**Setup**:
1. Create UOMs: Tablet, Strip, Card, Pack
2. Configure product UOMs with conversion factors:
   - Tablet: 1x (base)
   - Strip: 10x 
   - Card: 20x
   - Pack: 60x
3. Set pricing for each UOM level
4. Define packaging hierarchy

**Sales Examples**:
- Customer buys 1 tablet: Deduct 1 tablet from inventory
- Customer buys 1 strip: Deduct 10 tablets from inventory  
- Customer buys 1 card: Deduct 20 tablets from inventory
- Customer buys 1 pack: Deduct 60 tablets from inventory

### Scenario 2: Liquid Medicine

**Product**: Cough Syrup 100ml bottle
**Structure**:
- 1 Case = 12 Bottles
- 1 Bottle = 100ml
- 1 Dose = 5ml
- Base Unit = ml

**Configuration**:
- ml: 1x (base)
- Dose: 5x
- Bottle: 100x
- Case: 1200x

### Scenario 3: Injectable Medicine

**Product**: Insulin Vial
**Structure**:
- 1 Box = 5 Vials
- 1 Vial = 10ml
- 1 Unit = 0.01ml (for precise dosing)
- Base Unit = Unit

## Database Schema

### Core Tables

```sql
-- Master table for all units of measure
units_of_measure
├── id (UUID)
├── business_id (UUID) 
├── code (VARCHAR) -- PACK, CARD, STRIP, TAB
├── name (VARCHAR) -- Pack, Card, Strip, Tablet
├── abbreviation (VARCHAR) -- pk, cd, st, tab
├── category (ENUM) -- packaging, weight, volume, count
├── is_base_unit (BOOLEAN)
└── is_active (BOOLEAN)

-- Product-specific UOM configurations
product_uoms
├── id (UUID)
├── product_id (UUID)
├── uom_id (UUID)
├── is_base_uom (BOOLEAN) -- for inventory tracking
├── is_selling_uom (BOOLEAN) -- can be sold
├── is_purchasing_uom (BOOLEAN) -- can be purchased
├── conversion_factor (DECIMAL) -- base units per this UOM
├── price_per_unit (DECIMAL) -- optional price override
├── barcode (VARCHAR) -- UOM-specific barcode
└── sku_suffix (VARCHAR) -- SKU modifier

-- Complex packaging relationships
product_packaging_hierarchy  
├── id (UUID)
├── product_id (UUID)
├── parent_uom_id (UUID) -- larger package
├── child_uom_id (UUID) -- smaller package
├── quantity_per_parent (DECIMAL) -- child units per parent
└── level_order (INTEGER) -- hierarchy level

-- Multi-UOM inventory tracking
inventory_by_uom
├── id (UUID) 
├── inventory_id (UUID)
├── uom_id (UUID)
├── quantity (DECIMAL)
├── reserved_quantity (DECIMAL)
└── updated_at (TIMESTAMP)
```

## Implementation Guide

### Step 1: Set Up UOMs

```typescript
// Create business UOMs
const uoms = [
  { code: 'TAB', name: 'Tablet', category: 'packaging', isBaseUnit: true },
  { code: 'STRIP', name: 'Strip', category: 'packaging', isBaseUnit: false },
  { code: 'CARD', name: 'Card', category: 'packaging', isBaseUnit: false },
  { code: 'PACK', name: 'Pack', category: 'packaging', isBaseUnit: false },
];

await createDefaultPharmacyUOMs(businessId);
```

### Step 2: Configure Product UOMs

```typescript
// Configure which UOMs a product can use
const productUOMs = [
  {
    uomId: tabletUOMId,
    conversionFactor: 1, // base unit
    pricePerUnit: 0.50,
    isBaseUom: true,
    isSellingUom: true,
  },
  {
    uomId: stripUOMId, 
    conversionFactor: 10, // 1 strip = 10 tablets
    pricePerUnit: 4.50,
    isSellingUom: true,
    barcode: "PRODUCT-STRIP-001",
  },
  {
    uomId: cardUOMId,
    conversionFactor: 20, // 1 card = 20 tablets  
    pricePerUnit: 8.50,
    isSellingUom: true,
    isPurchasingUom: true,
  },
];
```

### Step 3: Set Up Packaging Hierarchy

```typescript
// Define package relationships
const hierarchy = [
  {
    parentUomId: stripUOMId,
    childUomId: tabletUOMId, 
    quantityPerParent: 10, // 10 tablets per strip
    levelOrder: 4,
  },
  {
    parentUomId: cardUOMId,
    childUomId: stripUOMId,
    quantityPerParent: 2, // 2 strips per card
    levelOrder: 3, 
  },
  {
    parentUomId: packUOMId,
    childUomId: cardUOMId,
    quantityPerParent: 3, // 3 cards per pack
    levelOrder: 2,
  },
];
```

### Step 4: Handle Sales Transactions

```typescript
// Customer buys 2 cards
const saleResult = await processSaleTransaction(
  locationId,
  productId, 
  2, // quantity
  cardUOMId, // selling UOM
  userId,
  transactionId
);

// System automatically:
// 1. Converts 2 cards to 40 tablets (base units)
// 2. Deducts 40 tablets from inventory
// 3. Updates all UOM-level inventory tracking
// 4. Logs the transaction with UOM details
```

## API Usage Examples

### Get Product UOMs

```typescript
GET /api/products/{productId}/uoms

Response:
[
  {
    "uomId": "uuid",
    "uomCode": "TAB", 
    "uomName": "Tablet",
    "conversionFactor": 1,
    "pricePerUnit": 0.50,
    "isBaseUom": true,
    "isSellingUom": true
  },
  {
    "uomId": "uuid",
    "uomCode": "STRIP",
    "uomName": "Strip", 
    "conversionFactor": 10,
    "pricePerUnit": 4.50,
    "isSellingUom": true
  }
]
```

### Convert Quantities

```typescript
import { convertProductQuantity } from '@/lib/uom-utils';

// Convert 3 cards to tablets
const result = await convertProductQuantity(
  productId,
  cardUOMId,
  tabletUOMId, 
  3
);

// Result: { success: true, convertedQuantity: 60 }
```

### Check Stock Availability

```typescript
import { checkStockAvailability } from '@/lib/inventory-utils';

// Check if 5 strips are available
const availability = await checkStockAvailability(
  locationId,
  productId,
  5,
  stripUOMId
);

// Result: { available: true, currentStock: 1000 }
```

## Frontend Components

### Product Search with UOM Selection

The enhanced product search component allows customers to:
- Select different UOMs for the same product
- See prices for each UOM level
- View stock availability in selected UOM
- Add specific quantities of specific UOMs to cart

### Cart with UOM Display

The cart component shows:
- Product name with selected UOM
- Unit price for selected UOM
- Conversion factor information
- Total price calculations

### UOM Management Interface

Admin interface for:
- Creating and managing business UOMs
- Configuring product UOM relationships
- Setting up packaging hierarchies
- Managing conversion factors and pricing

## Best Practices

### 1. **Inventory Management**
- Always use base units for core inventory tracking
- Update all UOM levels when inventory changes
- Track expiry dates at appropriate UOM levels

### 2. **Pricing Strategy** 
- Set competitive prices for bulk purchases
- Consider offering discounts for larger UOMs
- Update prices consistently across UOM levels

### 3. **Stock Control**
- Set minimum stock levels based on base units
- Monitor stock across all UOM levels
- Configure reorder points appropriately

### 4. **Barcode Management**
- Use unique barcodes for each UOM level
- Follow consistent barcode naming conventions
- Integrate with barcode scanners for accurate scanning

## Troubleshooting

### Common Issues

1. **Conversion Errors**
   - Verify conversion factors are correct
   - Check that base UOM is properly configured
   - Ensure UOM relationships are set up correctly

2. **Inventory Discrepancies**
   - Reconcile inventory across all UOM levels
   - Check for partial package sales
   - Verify adjustment logs

3. **Pricing Issues**
   - Confirm price calculations are correct
   - Check for UOM-specific price overrides
   - Validate bulk discount calculations

### Error Messages

- "UOM conversion failed" - Check conversion factors and UOM configuration
- "Insufficient stock" - Verify inventory levels in base units
- "Invalid UOM for product" - Ensure UOM is configured for the specific product

## Migration from Simple Inventory

If migrating from a simple inventory system:

1. **Identify Products**: List products that need UOM support
2. **Define UOMs**: Create necessary units of measure
3. **Set Conversion Factors**: Calculate conversion ratios
4. **Update Inventory**: Convert existing stock to base units
5. **Configure Pricing**: Set prices for each UOM level
6. **Test Transactions**: Verify sales work correctly
7. **Train Staff**: Educate team on new UOM features

This UOM system provides the flexibility needed for complex pharmaceutical inventory management while maintaining accuracy and ease of use.