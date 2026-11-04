-- Migration: Update shifts and transactions tables for admin functionality (safe version)
-- Add missing columns for enhanced shift and transaction tracking

-- Check and add columns to shifts table safely
DO $$ 
BEGIN
    -- Add business_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'business_id') THEN
        ALTER TABLE shifts ADD COLUMN business_id UUID;
        -- Update existing shifts to have business_id from location
        UPDATE shifts 
        SET business_id = l.business_id 
        FROM locations l 
        WHERE shifts.location_id = l.id 
        AND shifts.business_id IS NULL;
        -- Add foreign key constraint
        ALTER TABLE shifts ADD CONSTRAINT fk_shifts_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
        -- Make it NOT NULL
        ALTER TABLE shifts ALTER COLUMN business_id SET NOT NULL;
    END IF;

    -- Add cash_variance if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'cash_variance') THEN
        ALTER TABLE shifts ADD COLUMN cash_variance NUMERIC(10,2) DEFAULT 0.00;
    END IF;

    -- Add total_sales if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'total_sales') THEN
        ALTER TABLE shifts ADD COLUMN total_sales NUMERIC(10,2) DEFAULT 0.00;
    END IF;

    -- Add transaction_count if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'transaction_count') THEN
        ALTER TABLE shifts ADD COLUMN transaction_count INTEGER DEFAULT 0;
    END IF;

    -- Check if we need to rename opened_at to start_time
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'opened_at') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'start_time') THEN
        ALTER TABLE shifts RENAME COLUMN opened_at TO start_time;
    END IF;

    -- Check if we need to rename closed_at to end_time
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'closed_at') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'end_time') THEN
        ALTER TABLE shifts RENAME COLUMN closed_at TO end_time;
    END IF;

END $$;

-- Check and add columns to transactions table safely
DO $$ 
BEGIN
    -- Add business_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'business_id') THEN
        ALTER TABLE transactions ADD COLUMN business_id UUID;
        -- Update existing transactions to have business_id from location
        UPDATE transactions 
        SET business_id = l.business_id 
        FROM locations l 
        WHERE transactions.location_id = l.id 
        AND transactions.business_id IS NULL;
        -- Add foreign key constraint
        ALTER TABLE transactions ADD CONSTRAINT fk_transactions_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
        -- Make it NOT NULL
        ALTER TABLE transactions ALTER COLUMN business_id SET NOT NULL;
    END IF;

    -- Add item_count if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'item_count') THEN
        ALTER TABLE transactions ADD COLUMN item_count INTEGER DEFAULT 1;
    END IF;

END $$;

-- Update status enum for shifts safely
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'shifts_status_check') THEN
        ALTER TABLE shifts DROP CONSTRAINT shifts_status_check;
    END IF;
    
    -- Add new constraint
    ALTER TABLE shifts ADD CONSTRAINT shifts_status_check 
    CHECK (status IN ('active', 'completed', 'cancelled', 'open', 'closed'));
END $$;

-- Create indexes if they don't exist
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
WHERE total_sales = 0 OR total_sales IS NULL;