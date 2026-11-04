-- Add inventory adjustment type enum
CREATE TYPE inventory_adjustment_type AS ENUM (
    'manual', 
    'sale', 
    'return', 
    'waste', 
    'theft', 
    'damage', 
    'recount', 
    'transfer_in', 
    'transfer_out', 
    'production', 
    'expired'
);

-- Create inventory adjustment logs table
CREATE TABLE inventory_adjustment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    adjustment_type inventory_adjustment_type NOT NULL,
    previous_quantity INTEGER NOT NULL,
    adjustment_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    reason TEXT NOT NULL,
    adjusted_by UUID NOT NULL REFERENCES users(id),
    reference_id UUID,
    reference_type TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for inventory adjustment logs
CREATE INDEX idx_inventory_adjustment_logs_location ON inventory_adjustment_logs(location_id);
CREATE INDEX idx_inventory_adjustment_logs_product ON inventory_adjustment_logs(product_id);
CREATE INDEX idx_inventory_adjustment_logs_type ON inventory_adjustment_logs(adjustment_type);
CREATE INDEX idx_inventory_adjustment_logs_date ON inventory_adjustment_logs(created_at);
CREATE INDEX idx_inventory_adjustment_logs_adjusted_by ON inventory_adjustment_logs(adjusted_by);

-- Create inventory transfers table
CREATE TABLE inventory_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_number TEXT NOT NULL UNIQUE,
    from_location_id UUID NOT NULL REFERENCES locations(id),
    to_location_id UUID NOT NULL REFERENCES locations(id),
    requested_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'shipped', 'received', 'cancelled')),
    notes TEXT,
    requested_date TIMESTAMPTZ DEFAULT now(),
    approved_date TIMESTAMPTZ,
    shipped_date TIMESTAMPTZ,
    received_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for inventory transfers
CREATE INDEX idx_inventory_transfers_number ON inventory_transfers(transfer_number);
CREATE INDEX idx_inventory_transfers_from ON inventory_transfers(from_location_id);
CREATE INDEX idx_inventory_transfers_to ON inventory_transfers(to_location_id);
CREATE INDEX idx_inventory_transfers_status ON inventory_transfers(status);

-- Create inventory transfer items table
CREATE TABLE inventory_transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES inventory_transfers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity_requested INTEGER NOT NULL,
    quantity_shipped INTEGER DEFAULT 0,
    quantity_received INTEGER DEFAULT 0,
    notes TEXT
);

-- Create indexes for inventory transfer items
CREATE INDEX idx_inventory_transfer_items_transfer ON inventory_transfer_items(transfer_id);
CREATE INDEX idx_inventory_transfer_items_product ON inventory_transfer_items(product_id);

-- Add some sample adjustment log entries (optional - remove in production)
INSERT INTO inventory_adjustment_logs (
    location_id, 
    product_id, 
    adjustment_type, 
    previous_quantity, 
    adjustment_quantity, 
    new_quantity, 
    reason, 
    adjusted_by,
    reference_type,
    notes
) VALUES 
-- You would need to replace these UUIDs with actual IDs from your database
-- This is just for reference
/*
(
    '00000000-0000-0000-0000-000000000001', -- location_id
    '00000000-0000-0000-0000-000000000001', -- product_id
    'manual',
    10,
    5,
    15,
    'Initial stock adjustment after inventory count',
    '00000000-0000-0000-0000-000000000001', -- adjusted_by (user_id)
    'manual',
    'Counted during opening inventory'
);
*/

COMMENT ON TABLE inventory_adjustment_logs IS 'Tracks all inventory quantity changes with reasons and audit trail';
COMMENT ON TABLE inventory_transfers IS 'Manages inventory transfers between locations';
COMMENT ON TABLE inventory_transfer_items IS 'Individual items in inventory transfers';

COMMENT ON COLUMN inventory_adjustment_logs.adjustment_type IS 'Type of adjustment: manual, sale, return, waste, theft, damage, recount, transfer_in, transfer_out, production, expired';
COMMENT ON COLUMN inventory_adjustment_logs.adjustment_quantity IS 'Positive for increases, negative for decreases';
COMMENT ON COLUMN inventory_adjustment_logs.reference_id IS 'ID of related transaction, transfer, etc.';
COMMENT ON COLUMN inventory_adjustment_logs.reference_type IS 'Type of reference: transaction, transfer, manual, etc.';
