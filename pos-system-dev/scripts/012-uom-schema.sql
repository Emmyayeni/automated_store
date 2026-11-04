-- Unit of Measure Management System for Pharmacy
-- Handles packaging hierarchies: Pack -> Card -> Strip -> Tablet, etc.

-- ===== CORE UOM SYSTEM =====

-- Units of Measure master table
CREATE TABLE IF NOT EXISTS units_of_measure (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL, -- e.g., "PACK", "CARD", "STRIP", "TAB", "ML", "MG"
    name VARCHAR(100) NOT NULL, -- e.g., "Pack", "Card", "Strip", "Tablet", "Milliliter"
    abbreviation VARCHAR(10) NOT NULL, -- e.g., "pk", "cd", "st", "tab", "ml"
    category VARCHAR(50) NOT NULL, -- "packaging", "weight", "volume", "count"
    is_base_unit BOOLEAN DEFAULT FALSE, -- true for the smallest sellable unit
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(business_id, code),
    UNIQUE(business_id, name)
);

-- Product UOM configurations - defines which units a product can be sold in
CREATE TABLE IF NOT EXISTS product_uoms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    uom_id UUID NOT NULL REFERENCES units_of_measure(id) ON DELETE CASCADE,
    is_base_uom BOOLEAN DEFAULT FALSE, -- the UOM for inventory tracking
    is_selling_uom BOOLEAN DEFAULT TRUE, -- can be sold in this UOM
    is_purchasing_uom BOOLEAN DEFAULT FALSE, -- can be purchased in this UOM
    conversion_factor DECIMAL(15,6) NOT NULL DEFAULT 1.0, -- how many base units = 1 of this UOM
    price_per_unit DECIMAL(10,2), -- selling price for this UOM (optional override)
    barcode VARCHAR(100), -- specific barcode for this UOM
    sku_suffix VARCHAR(20), -- suffix to add to main SKU (e.g., "-PK" for pack)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(product_id, uom_id),
    -- Ensure each product has exactly one base UOM
    EXCLUDE (product_id WITH =) WHERE (is_base_uom = TRUE)
);

-- UOM conversion rules - for complex hierarchies
CREATE TABLE IF NOT EXISTS uom_conversions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    from_uom_id UUID NOT NULL REFERENCES units_of_measure(id) ON DELETE CASCADE,
    to_uom_id UUID NOT NULL REFERENCES units_of_measure(id) ON DELETE CASCADE,
    conversion_factor DECIMAL(15,6) NOT NULL, -- from_qty * factor = to_qty
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(business_id, from_uom_id, to_uom_id)
);

-- ===== ENHANCED INVENTORY SYSTEM =====

-- Extend inventory table with UOM information
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS base_uom_id UUID REFERENCES units_of_measure(id);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS current_uom_id UUID REFERENCES units_of_measure(id);

-- Multi-UOM inventory tracking
CREATE TABLE IF NOT EXISTS inventory_by_uom (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    uom_id UUID NOT NULL REFERENCES units_of_measure(id) ON DELETE CASCADE,
    quantity DECIMAL(15,6) NOT NULL DEFAULT 0,
    reserved_quantity DECIMAL(15,6) DEFAULT 0, -- for pending orders
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(inventory_id, uom_id)
);

-- ===== TRANSACTION ENHANCEMENTS =====

-- Add UOM to transaction items
ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS uom_id UUID REFERENCES units_of_measure(id);
ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS base_unit_quantity DECIMAL(15,6); -- quantity in base units

-- ===== PHARMACY-SPECIFIC PACKAGING =====

-- Packaging hierarchy for complex pharmaceutical products
CREATE TABLE IF NOT EXISTS product_packaging_hierarchy (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    parent_uom_id UUID NOT NULL REFERENCES units_of_measure(id), -- e.g., "PACK"
    child_uom_id UUID NOT NULL REFERENCES units_of_measure(id),  -- e.g., "CARD"
    quantity_per_parent DECIMAL(15,6) NOT NULL, -- how many child units per parent
    level_order INTEGER NOT NULL, -- 1=highest (pack), 2=card, 3=strip, 4=tablet
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(product_id, parent_uom_id, child_uom_id)
);

-- ===== SEED DATA FOR PHARMACY UOMS =====

-- Insert common pharmaceutical UOMs
INSERT INTO units_of_measure (business_id, code, name, abbreviation, category, is_base_unit) 
VALUES 
    -- Get the first business ID for seeding
    ((SELECT id FROM businesses LIMIT 1), 'TAB', 'Tablet', 'tab', 'packaging', TRUE),
    ((SELECT id FROM businesses LIMIT 1), 'CAP', 'Capsule', 'cap', 'packaging', TRUE),
    ((SELECT id FROM businesses LIMIT 1), 'STRIP', 'Strip', 'strip', 'packaging', FALSE),
    ((SELECT id FROM businesses LIMIT 1), 'CARD', 'Card', 'card', 'packaging', FALSE),
    ((SELECT id FROM businesses LIMIT 1), 'PACK', 'Pack', 'pack', 'packaging', FALSE),
    ((SELECT id FROM businesses LIMIT 1), 'BOX', 'Box', 'box', 'packaging', FALSE),
    ((SELECT id FROM businesses LIMIT 1), 'BOTTLE', 'Bottle', 'bottle', 'packaging', FALSE),
    ((SELECT id FROM businesses LIMIT 1), 'VIAL', 'Vial', 'vial', 'packaging', FALSE),
    ((SELECT id FROM businesses LIMIT 1), 'TUBE', 'Tube', 'tube', 'packaging', FALSE),
    ((SELECT id FROM businesses LIMIT 1), 'SACHET', 'Sachet', 'sachet', 'packaging', FALSE),
    -- Volume measures
    ((SELECT id FROM businesses LIMIT 1), 'ML', 'Milliliter', 'ml', 'volume', TRUE),
    ((SELECT id FROM businesses LIMIT 1), 'L', 'Liter', 'l', 'volume', FALSE),
    -- Weight measures
    ((SELECT id FROM businesses LIMIT 1), 'MG', 'Milligram', 'mg', 'weight', TRUE),
    ((SELECT id FROM businesses LIMIT 1), 'G', 'Gram', 'g', 'weight', FALSE),
    ((SELECT id FROM businesses LIMIT 1), 'KG', 'Kilogram', 'kg', 'weight', FALSE),
    -- Count measures
    ((SELECT id FROM businesses LIMIT 1), 'PIECE', 'Piece', 'pc', 'count', TRUE),
    ((SELECT id FROM businesses LIMIT 1), 'PAIR', 'Pair', 'pair', 'count', FALSE)
ON CONFLICT (business_id, code) DO NOTHING;

-- ===== INDEXES FOR PERFORMANCE =====

CREATE INDEX IF NOT EXISTS idx_product_uoms_product ON product_uoms(product_id);
CREATE INDEX IF NOT EXISTS idx_product_uoms_uom ON product_uoms(uom_id);
CREATE INDEX IF NOT EXISTS idx_product_uoms_base ON product_uoms(product_id) WHERE is_base_uom = TRUE;
CREATE INDEX IF NOT EXISTS idx_product_uoms_selling ON product_uoms(product_id) WHERE is_selling_uom = TRUE;

CREATE INDEX IF NOT EXISTS idx_inventory_by_uom_inventory ON inventory_by_uom(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_by_uom_uom ON inventory_by_uom(uom_id);

CREATE INDEX IF NOT EXISTS idx_packaging_hierarchy_product ON product_packaging_hierarchy(product_id);
CREATE INDEX IF NOT EXISTS idx_packaging_hierarchy_parent ON product_packaging_hierarchy(parent_uom_id);
CREATE INDEX IF NOT EXISTS idx_packaging_hierarchy_child ON product_packaging_hierarchy(child_uom_id);

CREATE INDEX IF NOT EXISTS idx_uom_conversions_from ON uom_conversions(from_uom_id);
CREATE INDEX IF NOT EXISTS idx_uom_conversions_to ON uom_conversions(to_uom_id);

-- ===== EXAMPLE DATA SETUP =====

-- Example: Paracetamol 500mg
-- Structure: 1 Pack = 3 Cards, 1 Card = 2 Strips, 1 Strip = 10 Tablets
-- This would be set up as:
-- 1. Create product_uoms for each level
-- 2. Set tablet as base_uom (is_base_uom = true)
-- 3. Create packaging hierarchy entries
-- 4. Set conversion factors: Strip=10 tabs, Card=20 tabs, Pack=60 tabs

COMMENT ON TABLE units_of_measure IS 'Master table for all units of measure used in the pharmacy';
COMMENT ON TABLE product_uoms IS 'Defines which UOMs each product can be sold/purchased in with conversion factors';
COMMENT ON TABLE uom_conversions IS 'General conversion rules between different UOMs';
COMMENT ON TABLE inventory_by_uom IS 'Tracks inventory quantities in different UOMs for better stock management';
COMMENT ON TABLE product_packaging_hierarchy IS 'Defines complex packaging hierarchies for pharmaceutical products';