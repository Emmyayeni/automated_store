-- Migration: Update shifts and transactions tables for admin functionality
-- Add missing columns for enhanced shift and transaction tracking

-- Update shifts table
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cash_variance NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_sales NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS transaction_count INTEGER DEFAULT 0;

-- Update existing shifts to have business_id from location
UPDATE shifts 
SET business_id = l.business_id 
FROM locations l 
WHERE shifts.location_id = l.id 
AND shifts.business_id IS NULL;

-- Make business_id NOT NULL after populating
ALTER TABLE shifts ALTER COLUMN business_id SET NOT NULL;

-- Update shifts status enum
ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_status_check;
ALTER TABLE shifts ADD CONSTRAINT shifts_status_check 
CHECK (status IN ('active', 'completed', 'cancelled'));

-- Rename columns to match new schema
ALTER TABLE shifts RENAME COLUMN opened_at TO start_time;
ALTER TABLE shifts RENAME COLUMN closed_at TO end_time;

-- Update transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS item_count INTEGER DEFAULT 1;

-- Update existing transactions to have business_id from location
UPDATE transactions 
SET business_id = l.business_id 
FROM locations l 
WHERE transactions.location_id = l.id 
AND transactions.business_id IS NULL;

-- Make business_id NOT NULL after populating
ALTER TABLE transactions ALTER COLUMN business_id SET NOT NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shifts_business_id ON shifts(business_id);
CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON shifts(start_time);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_user_location ON shifts(user_id, location_id);

CREATE INDEX IF NOT EXISTS idx_transactions_business_id ON transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_cashier_id ON transactions(cashier_id);

-- Update any existing shift data with reasonable defaults
UPDATE shifts 
SET 
  total_sales = COALESCE((
    SELECT SUM(t.total) 
    FROM transactions t 
    WHERE t.cashier_id = shifts.user_id 
    AND DATE(t.created_at) = DATE(shifts.start_time)
  ), 0),
  transaction_count = COALESCE((
    SELECT COUNT(*) 
    FROM transactions t 
    WHERE t.cashier_id = shifts.user_id 
    AND DATE(t.created_at) = DATE(shifts.start_time)
  ), 0),
  cash_variance = COALESCE(closing_cash - opening_cash, 0)
WHERE total_sales = 0;