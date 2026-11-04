-- Enterprise features for 95% completion

-- Store locations for multi-location support
CREATE TABLE store_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    manager_id UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    timezone VARCHAR(50) DEFAULT 'UTC',
    tax_rate DECIMAL(5,4) DEFAULT 0.08,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update users table to include location
ALTER TABLE users ADD COLUMN location_id UUID REFERENCES store_locations(id);

-- Update products table for multi-location inventory
CREATE TABLE location_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) NOT NULL,
    location_id UUID REFERENCES store_locations(id) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    reorder_point INTEGER DEFAULT 10,
    max_stock INTEGER DEFAULT 100,
    last_counted_at TIMESTAMP,
    UNIQUE(product_id, location_id)
);

-- Inventory transfers between locations
CREATE TABLE inventory_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_number VARCHAR(50) UNIQUE NOT NULL,
    from_location_id UUID REFERENCES store_locations(id) NOT NULL,
    to_location_id UUID REFERENCES store_locations(id) NOT NULL,
    requested_by UUID REFERENCES users(id) NOT NULL,
    approved_by UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_transit', 'received', 'cancelled')),
    requested_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_date TIMESTAMP,
    shipped_date TIMESTAMP,
    received_date TIMESTAMP,
    notes TEXT
);

-- Inventory transfer items
CREATE TABLE inventory_transfer_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_id UUID REFERENCES inventory_transfers(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) NOT NULL,
    quantity_requested INTEGER NOT NULL,
    quantity_shipped INTEGER DEFAULT 0,
    quantity_received INTEGER DEFAULT 0
);

-- Split payment support
CREATE TABLE transaction_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reference_number VARCHAR(100),
    processor_response JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tips and gratuity
CREATE TABLE tips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id),
    employee_id UUID REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    tip_type VARCHAR(20) DEFAULT 'cash' CHECK (tip_type IN ('cash', 'card', 'split')),
    distribution_method VARCHAR(20) DEFAULT 'individual' CHECK (distribution_method IN ('individual', 'pooled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Discounts and promotions
CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    promotion_type VARCHAR(20) NOT NULL CHECK (promotion_type IN ('percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping')),
    discount_value DECIMAL(10,2),
    min_purchase_amount DECIMAL(10,2),
    max_discount_amount DECIMAL(10,2),
    buy_quantity INTEGER,
    get_quantity INTEGER,
    applicable_products JSONB, -- Array of product IDs
    applicable_categories JSONB, -- Array of category IDs
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    location_id UUID REFERENCES store_locations(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tax configurations
CREATE TABLE tax_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID REFERENCES store_locations(id),
    tax_name VARCHAR(100) NOT NULL,
    tax_rate DECIMAL(5,4) NOT NULL,
    tax_type VARCHAR(20) DEFAULT 'sales' CHECK (tax_type IN ('sales', 'vat', 'gst')),
    applicable_categories JSONB,
    is_inclusive BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User permissions
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL
);

-- Role permissions
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role VARCHAR(50) NOT NULL,
    permission_id UUID REFERENCES permissions(id),
    location_id UUID REFERENCES store_locations(id),
    UNIQUE(role, permission_id, location_id)
);

-- Hardware configurations
CREATE TABLE hardware_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID REFERENCES store_locations(id),
    device_type VARCHAR(50) NOT NULL CHECK (device_type IN ('printer', 'scanner', 'cash_drawer', 'display', 'scale')),
    device_name VARCHAR(255) NOT NULL,
    connection_type VARCHAR(20) NOT NULL CHECK (connection_type IN ('usb', 'bluetooth', 'network', 'serial')),
    connection_string TEXT,
    settings JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System settings
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID REFERENCES store_locations(id),
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(location_id, setting_key)
);

-- Insert default store location
INSERT INTO store_locations (name, code, address, phone, email, timezone) VALUES
('Main Store', 'MAIN', '123 Main Street, City, State 12345', '(555) 123-4567', 'main@store.com', 'America/New_York');

-- Insert default permissions
INSERT INTO permissions (name, description, module, action) VALUES
('view_sales', 'View sales transactions', 'sales', 'read'),
('create_sales', 'Create new sales', 'sales', 'create'),
('refund_sales', 'Process refunds', 'sales', 'refund'),
('void_sales', 'Void transactions', 'sales', 'void'),
('view_inventory', 'View inventory', 'inventory', 'read'),
('manage_inventory', 'Manage inventory', 'inventory', 'write'),
('view_customers', 'View customers', 'customers', 'read'),
('manage_customers', 'Manage customers', 'customers', 'write'),
('view_reports', 'View reports', 'reports', 'read'),
('manage_employees', 'Manage employees', 'employees', 'write'),
('manage_settings', 'Manage system settings', 'settings', 'write');

-- Insert default role permissions
INSERT INTO role_permissions (role, permission_id) 
SELECT 'admin', id FROM permissions;

INSERT INTO role_permissions (role, permission_id) 
SELECT 'manager', id FROM permissions WHERE name NOT IN ('manage_settings');

INSERT INTO role_permissions (role, permission_id) 
SELECT 'cashier', id FROM permissions WHERE name IN ('view_sales', 'create_sales', 'view_inventory', 'view_customers');

-- Insert default tax configuration
INSERT INTO tax_configurations (location_id, tax_name, tax_rate, tax_type) 
SELECT id, 'Sales Tax', 0.08, 'sales' FROM store_locations WHERE code = 'MAIN';

-- Insert default system settings
INSERT INTO system_settings (location_id, setting_key, setting_value, setting_type, description)
SELECT id, 'receipt_footer', 'Thank you for your business!', 'string', 'Footer text for receipts'
FROM store_locations WHERE code = 'MAIN';

INSERT INTO system_settings (location_id, setting_key, setting_value, setting_type, description)
SELECT id, 'loyalty_points_rate', '1', 'number', 'Points earned per dollar spent'
FROM store_locations WHERE code = 'MAIN';

INSERT INTO system_settings (location_id, setting_key, setting_value, setting_type, description)
SELECT id, 'auto_print_receipt', 'true', 'boolean', 'Automatically print receipts'
FROM store_locations WHERE code = 'MAIN';

-- Create indexes
CREATE INDEX idx_location_inventory_product ON location_inventory(product_id);
CREATE INDEX idx_location_inventory_location ON location_inventory(location_id);
CREATE INDEX idx_inventory_transfers_status ON inventory_transfers(status);
CREATE INDEX idx_transaction_payments_transaction ON transaction_payments(transaction_id);
CREATE INDEX idx_tips_employee ON tips(employee_id);
CREATE INDEX idx_promotions_active ON promotions(is_active, start_date, end_date);
CREATE INDEX idx_hardware_configs_location ON hardware_configs(location_id);
