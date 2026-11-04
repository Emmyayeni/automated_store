-- Final features for 100% completion

-- Analytics and forecasting tables
CREATE TABLE sales_forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID REFERENCES store_locations(id),
    product_id UUID REFERENCES products(id),
    forecast_date DATE NOT NULL,
    predicted_quantity INTEGER NOT NULL,
    predicted_revenue DECIMAL(10,2) NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL,
    model_version VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer behavior analytics
CREATE TABLE customer_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id),
    location_id UUID REFERENCES store_locations(id),
    visit_frequency DECIMAL(5,2), -- visits per month
    average_transaction_value DECIMAL(10,2),
    preferred_categories JSONB,
    churn_risk_score DECIMAL(3,2),
    lifetime_value DECIMAL(10,2),
    last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory optimization
CREATE TABLE reorder_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id),
    location_id UUID REFERENCES store_locations(id),
    current_stock INTEGER NOT NULL,
    suggested_order_quantity INTEGER NOT NULL,
    urgency_level VARCHAR(20) CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
    reason TEXT,
    estimated_stockout_date DATE,
    suggested_supplier_id UUID REFERENCES suppliers(id),
    is_processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Third-party integrations
CREATE TABLE integration_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_name VARCHAR(100) NOT NULL,
    location_id UUID REFERENCES store_locations(id),
    config_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_sync TIMESTAMP,
    sync_status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sync logs for third-party integrations
CREATE TABLE sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID REFERENCES integration_configs(id),
    sync_type VARCHAR(50) NOT NULL,
    records_processed INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL,
    error_details JSONB,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Email/SMS marketing campaigns
CREATE TABLE marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    campaign_type VARCHAR(20) CHECK (campaign_type IN ('email', 'sms', 'push')),
    target_audience JSONB, -- customer segments
    message_template TEXT NOT NULL,
    scheduled_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled')),
    sent_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    location_id UUID REFERENCES store_locations(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Offline transaction queue
CREATE TABLE offline_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(100) NOT NULL,
    location_id UUID REFERENCES store_locations(id),
    transaction_data JSONB NOT NULL,
    created_offline_at TIMESTAMP NOT NULL,
    sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed', 'conflict')),
    sync_attempts INTEGER DEFAULT 0,
    last_sync_attempt TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mobile device registrations
CREATE TABLE mobile_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(100) UNIQUE NOT NULL,
    device_name VARCHAR(255),
    device_type VARCHAR(50), -- tablet, phone, etc.
    user_id UUID REFERENCES users(id),
    location_id UUID REFERENCES store_locations(id),
    last_seen TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    sync_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- E-commerce integration
CREATE TABLE ecommerce_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id),
    platform VARCHAR(50) NOT NULL, -- shopify, woocommerce, etc.
    external_id VARCHAR(100) NOT NULL,
    sync_status VARCHAR(20) DEFAULT 'pending',
    last_synced TIMESTAMP,
    sync_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, platform)
);

-- Performance metrics
CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID REFERENCES store_locations(id),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_date DATE NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- sales, inventory, customer, etc.
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample analytics data
INSERT INTO customer_analytics (customer_id, location_id, visit_frequency, average_transaction_value, preferred_categories, churn_risk_score, lifetime_value)
SELECT 
    c.id,
    sl.id,
    ROUND((RANDOM() * 10 + 1)::numeric, 2),
    ROUND((RANDOM() * 100 + 20)::numeric, 2),
    '["Electronics", "Clothing"]'::jsonb,
    ROUND((RANDOM() * 0.5)::numeric, 2),
    ROUND((RANDOM() * 1000 + 100)::numeric, 2)
FROM customers c
CROSS JOIN store_locations sl
WHERE sl.code = 'MAIN'
LIMIT 10;

-- Insert sample reorder suggestions
INSERT INTO reorder_suggestions (product_id, location_id, current_stock, suggested_order_quantity, urgency_level, reason, estimated_stockout_date)
SELECT 
    p.id,
    sl.id,
    p.stock_quantity,
    CASE 
        WHEN p.stock_quantity <= p.low_stock_threshold THEN p.low_stock_threshold * 3
        ELSE p.low_stock_threshold * 2
    END,
    CASE 
        WHEN p.stock_quantity = 0 THEN 'critical'
        WHEN p.stock_quantity <= p.low_stock_threshold / 2 THEN 'high'
        WHEN p.stock_quantity <= p.low_stock_threshold THEN 'medium'
        ELSE 'low'
    END,
    'Automated reorder suggestion based on sales velocity',
    CURRENT_DATE + INTERVAL '7 days'
FROM products p
CROSS JOIN store_locations sl
WHERE sl.code = 'MAIN' AND p.stock_quantity <= p.low_stock_threshold * 2;

-- Create indexes for performance
CREATE INDEX idx_sales_forecasts_date ON sales_forecasts(forecast_date);
CREATE INDEX idx_sales_forecasts_product ON sales_forecasts(product_id);
CREATE INDEX idx_customer_analytics_customer ON customer_analytics(customer_id);
CREATE INDEX idx_reorder_suggestions_urgency ON reorder_suggestions(urgency_level, is_processed);
CREATE INDEX idx_offline_transactions_sync ON offline_transactions(sync_status);
CREATE INDEX idx_performance_metrics_date ON performance_metrics(metric_date, location_id);
