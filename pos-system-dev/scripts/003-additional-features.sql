-- Add tables for new features

-- Cash drawer sessions
CREATE TABLE cash_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) NOT NULL,
    opening_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    closing_amount DECIMAL(10,2),
    expected_amount DECIMAL(10,2),
    variance DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP
);

-- Held transactions (for hold/retrieve functionality)
CREATE TABLE held_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) NOT NULL,
    customer_id UUID REFERENCES customers(id),
    items JSONB NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    hold_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Store settings
CREATE TABLE store_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_name VARCHAR(255) NOT NULL DEFAULT 'My Store',
    store_address TEXT,
    store_phone VARCHAR(20),
    store_email VARCHAR(255),
    tax_rate DECIMAL(5,4) DEFAULT 0.08,
    receipt_footer TEXT,
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default store settings
INSERT INTO store_settings (store_name, store_address, store_phone, store_email, receipt_footer) 
VALUES (
    'HARDYPOS Demo Store',
    '123 Main Street, City, State 12345',
    '(555) 123-4567',
    'info@hardypos.com',
    'Thank you for your business! Returns accepted within 30 days with receipt.'
);

-- Add receipt_sent column to transactions
ALTER TABLE transactions ADD COLUMN receipt_sent BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN receipt_email VARCHAR(255);

-- Create indexes for new tables
CREATE INDEX idx_cash_sessions_user ON cash_sessions(user_id);
CREATE INDEX idx_cash_sessions_status ON cash_sessions(status);
CREATE INDEX idx_held_transactions_user ON held_transactions(user_id);
