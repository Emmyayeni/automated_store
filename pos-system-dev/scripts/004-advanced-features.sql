-- Advanced features for 80% completion

-- Suppliers table
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchase orders
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    user_id UUID REFERENCES users(id) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'received', 'cancelled')),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expected_date DATE,
    received_date TIMESTAMP,
    total_amount DECIMAL(10,2) DEFAULT 0,
    notes TEXT
);

-- Purchase order items
CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity_ordered INTEGER NOT NULL,
    quantity_received INTEGER DEFAULT 0,
    unit_cost DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL
);

-- Employee time tracking
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) NOT NULL,
    clock_in TIMESTAMP NOT NULL,
    clock_out TIMESTAMP,
    break_start TIMESTAMP,
    break_end TIMESTAMP,
    total_hours DECIMAL(5,2),
    hourly_rate DECIMAL(8,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gift cards
CREATE TABLE gift_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_number VARCHAR(50) UNIQUE NOT NULL,
    balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    initial_amount DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    issued_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiry_date DATE,
    customer_id UUID REFERENCES customers(id)
);

-- Gift card transactions
CREATE TABLE gift_card_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gift_card_id UUID REFERENCES gift_cards(id),
    transaction_id UUID REFERENCES transactions(id),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('issue', 'redeem', 'refund')),
    amount DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loyalty program tiers
CREATE TABLE loyalty_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    min_points INTEGER NOT NULL DEFAULT 0,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    points_multiplier DECIMAL(3,2) DEFAULT 1.0,
    benefits TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loyalty rewards
CREATE TABLE loyalty_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    points_required INTEGER NOT NULL,
    reward_type VARCHAR(50) NOT NULL CHECK (reward_type IN ('discount', 'free_item', 'gift_card')),
    reward_value DECIMAL(10,2),
    product_id UUID REFERENCES products(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loyalty transactions
CREATE TABLE loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) NOT NULL,
    transaction_id UUID REFERENCES transactions(id),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earn', 'redeem', 'expire')),
    points INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Low stock alerts
CREATE TABLE stock_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) NOT NULL,
    alert_type VARCHAR(20) DEFAULT 'low_stock' CHECK (alert_type IN ('low_stock', 'out_of_stock')),
    current_stock INTEGER NOT NULL,
    threshold INTEGER NOT NULL,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- Add supplier reference to products
ALTER TABLE products ADD COLUMN supplier_id UUID REFERENCES suppliers(id);

-- Insert default loyalty tiers
INSERT INTO loyalty_tiers (name, min_points, discount_percentage, points_multiplier, benefits) VALUES
('Bronze', 0, 0, 1.0, 'Earn 1 point per dollar spent'),
('Silver', 500, 5, 1.2, 'Earn 1.2 points per dollar + 5% discount'),
('Gold', 1000, 10, 1.5, 'Earn 1.5 points per dollar + 10% discount'),
('Platinum', 2500, 15, 2.0, 'Earn 2 points per dollar + 15% discount');

-- Insert sample loyalty rewards
INSERT INTO loyalty_rewards (name, description, points_required, reward_type, reward_value) VALUES
('$5 Off Purchase', 'Get $5 off your next purchase', 100, 'discount', 5.00),
('$10 Off Purchase', 'Get $10 off your next purchase', 200, 'discount', 10.00),
('Free Coffee', 'Get a free coffee', 50, 'free_item', 0),
('$25 Gift Card', 'Receive a $25 gift card', 500, 'gift_card', 25.00);

-- Insert sample suppliers
INSERT INTO suppliers (name, contact_person, email, phone, address) VALUES
('Tech Supplies Inc', 'John Smith', 'john@techsupplies.com', '555-0100', '123 Tech Street, Tech City, TC 12345'),
('Fashion Wholesale', 'Jane Doe', 'jane@fashionwholesale.com', '555-0101', '456 Fashion Ave, Style City, SC 67890'),
('Food Distributors LLC', 'Bob Johnson', 'bob@fooddist.com', '555-0102', '789 Food Blvd, Taste Town, TT 54321');

-- Create indexes for performance
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_time_entries_user ON time_entries(user_id);
CREATE INDEX idx_time_entries_date ON time_entries(clock_in);
CREATE INDEX idx_gift_cards_number ON gift_cards(card_number);
CREATE INDEX idx_loyalty_transactions_customer ON loyalty_transactions(customer_id);
CREATE INDEX idx_stock_alerts_product ON stock_alerts(product_id);
CREATE INDEX idx_stock_alerts_resolved ON stock_alerts(is_resolved);
