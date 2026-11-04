-- Medical Equipment Fields Migration
-- Add equipment-specific fields to the products table

-- Equipment and medical device fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS model_number TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS serial_number TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS warranty_period TEXT; -- e.g., "24 months"
ALTER TABLE products ADD COLUMN IF NOT EXISTS equipment_type TEXT; -- diagnostic, therapeutic, surgical, laboratory, monitoring
ALTER TABLE products ADD COLUMN IF NOT EXISTS power_requirements TEXT; -- e.g., "100-240V AC"
ALTER TABLE products ADD COLUMN IF NOT EXISTS dimensions TEXT; -- e.g., "30cm x 20cm x 15cm"
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight TEXT; -- e.g., "2.5kg"
ALTER TABLE products ADD COLUMN IF NOT EXISTS maintenance_schedule TEXT; -- e.g., "Every 6 months"
ALTER TABLE products ADD COLUMN IF NOT EXISTS calibration_required BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS needs_maintenance BOOLEAN DEFAULT FALSE;

-- Storage and inventory fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_level INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 10;
ALTER TABLE products ADD COLUMN IF NOT EXISTS location TEXT; -- storage location

-- Certification and compliance
ALTER TABLE products ADD COLUMN IF NOT EXISTS certification_number TEXT; -- CE, FDA numbers
ALTER TABLE products ADD COLUMN IF NOT EXISTS special_handling TEXT; -- special handling instructions

-- Update storage conditions to be more generic (not just for drugs)
-- Create new enum for general storage conditions
DO $$ BEGIN
    CREATE TYPE general_storage_conditions AS ENUM (
        'room_temperature', 
        'refrigerated', 
        'frozen', 
        'controlled_environment'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add general storage conditions column
ALTER TABLE products ADD COLUMN IF NOT EXISTS general_storage_conditions general_storage_conditions DEFAULT 'room_temperature';

-- Update existing records to use general storage conditions
UPDATE products 
SET general_storage_conditions = 
    CASE 
        WHEN storage_conditions = 'room_temperature' THEN 'room_temperature'::general_storage_conditions
        WHEN storage_conditions = 'refrigerated' THEN 'refrigerated'::general_storage_conditions
        WHEN storage_conditions = 'frozen' THEN 'frozen'::general_storage_conditions
        WHEN storage_conditions = 'controlled_room' THEN 'controlled_environment'::general_storage_conditions
        ELSE 'room_temperature'::general_storage_conditions
    END;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_model_number ON products(model_number);
CREATE INDEX IF NOT EXISTS idx_products_expiry_date ON products(expiry_date);
CREATE INDEX IF NOT EXISTS idx_products_stock_level ON products(stock_level);
CREATE INDEX IF NOT EXISTS idx_products_business_category ON products(business_id, category);

-- Add comments for documentation
COMMENT ON COLUMN products.model_number IS 'Equipment model number for medical devices';
COMMENT ON COLUMN products.serial_number IS 'Unique serial number for equipment tracking';
COMMENT ON COLUMN products.warranty_period IS 'Warranty period in months or text description';
COMMENT ON COLUMN products.equipment_type IS 'Type of medical equipment: diagnostic, therapeutic, surgical, laboratory, monitoring';
COMMENT ON COLUMN products.calibration_required IS 'Whether equipment requires regular calibration';
COMMENT ON COLUMN products.needs_maintenance IS 'Current maintenance status flag';
COMMENT ON COLUMN products.general_storage_conditions IS 'Storage requirements for all product types';

-- Update the businesses table to ensure SLL currency is properly set
UPDATE businesses 
SET currency = 'SLL', 
    tax_rate = 0.15 
WHERE currency IS NULL OR currency = '';

-- Verify the migration
SELECT 
    COUNT(*) as total_products,
    COUNT(CASE WHEN category = 'pharmaceuticals' THEN 1 END) as pharmaceuticals,
    COUNT(CASE WHEN category = 'medical-equipment' THEN 1 END) as medical_equipment,
    COUNT(CASE WHEN category = 'laboratory-equipment' THEN 1 END) as lab_equipment,
    COUNT(CASE WHEN category = 'medical-supplies' THEN 1 END) as medical_supplies,
    COUNT(CASE WHEN category = 'other' THEN 1 END) as other_products
FROM products;