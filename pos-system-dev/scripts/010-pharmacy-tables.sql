-- Migration: Add pharmacy-specific tables to existing schema
-- File: scripts/010-pharmacy-tables.sql

-- Add inventory alerts table
CREATE TABLE IF NOT EXISTS inventory_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('expiry_critical', 'expiry_warning', 'expiry_caution', 'low_stock', 'out_of_stock', 'temperature', 'controlled_substance')),
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    message TEXT NOT NULL,
    details TEXT,
    expiry_date DATE,
    stock_level INTEGER,
    reorder_level INTEGER,
    storage_conditions TEXT DEFAULT 'room_temperature',
    is_controlled_substance BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add alert settings table
CREATE TABLE IF NOT EXISTS alert_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    expiry_alert_critical INTEGER DEFAULT 7,
    expiry_alert_warning INTEGER DEFAULT 30,
    expiry_alert_caution INTEGER DEFAULT 90,
    low_stock_enabled BOOLEAN DEFAULT TRUE,
    out_of_stock_enabled BOOLEAN DEFAULT TRUE,
    temperature_alerts_enabled BOOLEAN DEFAULT TRUE,
    controlled_substance_alerts_enabled BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    in_app_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id)
);

-- Add currency settings table
CREATE TABLE IF NOT EXISTS currency_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    currency_code TEXT DEFAULT 'SLL',
    currency_symbol TEXT DEFAULT 'Le',
    symbol_position TEXT DEFAULT 'before' CHECK (symbol_position IN ('before', 'after')),
    thousands_separator TEXT DEFAULT ',',
    decimal_separator TEXT DEFAULT '.',
    decimal_places INTEGER DEFAULT 2,
    tax_rate DECIMAL(5,4) DEFAULT 0.15,
    withholding_tax_rate DECIMAL(5,4) DEFAULT 0.05,
    compact_large_numbers BOOLEAN DEFAULT TRUE,
    rounding_precision TEXT DEFAULT 'nearest_cent' CHECK (rounding_precision IN ('nearest_cent', 'round_up', 'round_down')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id)
);

-- Create indexes for performance
CREATE INDEX idx_inventory_alerts_business_id ON inventory_alerts(business_id);
CREATE INDEX idx_inventory_alerts_product_id ON inventory_alerts(product_id);
CREATE INDEX idx_inventory_alerts_active ON inventory_alerts(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_inventory_alerts_type_severity ON inventory_alerts(alert_type, severity);

-- Create function to automatically generate inventory alerts
CREATE OR REPLACE FUNCTION generate_expiry_alerts()
RETURNS TRIGGER AS $$
DECLARE
    alert_settings_rec RECORD;
    days_until_expiry INTEGER;
    alert_type TEXT;
    severity TEXT;
    message TEXT;
    details TEXT;
BEGIN
    -- Get alert settings for the business
    SELECT * INTO alert_settings_rec 
    FROM alert_settings 
    WHERE business_id = NEW.business_id;
    
    -- If no settings found, use defaults
    IF NOT FOUND THEN
        INSERT INTO alert_settings (business_id) VALUES (NEW.business_id);
        SELECT * INTO alert_settings_rec 
        FROM alert_settings 
        WHERE business_id = NEW.business_id;
    END IF;
    
    -- Check expiry date if product has one
    IF NEW.expiry_date IS NOT NULL THEN
        days_until_expiry := NEW.expiry_date - CURRENT_DATE;
        
        -- Determine alert type and severity based on days until expiry
        IF days_until_expiry < 0 THEN
            alert_type := 'expiry_critical';
            severity := 'critical';
            message := 'Product has expired';
            details := 'This product expired ' || ABS(days_until_expiry) || ' days ago and should be removed from inventory immediately.';
        ELSIF days_until_expiry <= alert_settings_rec.expiry_alert_critical THEN
            alert_type := 'expiry_critical';
            severity := 'critical';
            message := 'Product expires within ' || days_until_expiry || ' days';
            details := 'Critical expiry alert: This product will expire in ' || days_until_expiry || ' days. Prioritize for immediate dispensing or disposal.';
        ELSIF days_until_expiry <= alert_settings_rec.expiry_alert_warning THEN
            alert_type := 'expiry_warning';
            severity := 'high';
            message := 'Product expires within ' || days_until_expiry || ' days';
            details := 'Warning: This product will expire in ' || days_until_expiry || ' days. Consider promoting or discounting to move stock.';
        ELSIF days_until_expiry <= alert_settings_rec.expiry_alert_caution THEN
            alert_type := 'expiry_caution';
            severity := 'medium';
            message := 'Product expires within ' || days_until_expiry || ' days';
            details := 'Caution: This product will expire in ' || days_until_expiry || ' days. Monitor closely and ensure FEFO rotation.';
        END IF;
        
        -- Insert alert if one should be generated
        IF alert_type IS NOT NULL THEN
            INSERT INTO inventory_alerts (
                product_id, business_id, alert_type, severity, message, details,
                expiry_date, storage_conditions, is_controlled_substance
            ) VALUES (
                NEW.id, NEW.business_id, alert_type, severity, message, details,
                NEW.expiry_date, NEW.storage_conditions, NEW.is_controlled_substance
            ) ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate alerts when products are inserted/updated
CREATE TRIGGER trigger_generate_expiry_alerts
    AFTER INSERT OR UPDATE OF expiry_date, business_id
    ON products
    FOR EACH ROW
    EXECUTE FUNCTION generate_expiry_alerts();

-- Insert default alert settings for existing businesses
INSERT INTO alert_settings (business_id)
SELECT id FROM businesses 
WHERE id NOT IN (SELECT business_id FROM alert_settings);

-- Insert default currency settings for existing businesses (Sierra Leone focus)
INSERT INTO currency_settings (business_id, currency_code, currency_symbol)
SELECT id, 'SLL', 'Le' FROM businesses 
WHERE id NOT IN (SELECT business_id FROM currency_settings);

COMMENT ON TABLE inventory_alerts IS 'Pharmacy inventory alerts for expiry dates, stock levels, and compliance';
COMMENT ON TABLE alert_settings IS 'Business-specific alert configuration and notification preferences';
COMMENT ON TABLE currency_settings IS 'Regional currency formatting and tax configuration for businesses';