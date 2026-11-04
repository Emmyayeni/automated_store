-- HARDYPOS Demo Data Cleanup - SQL Version
-- ==========================================
-- 
-- This SQL script deletes all demo data from the database.
-- Execute this script in your PostgreSQL client (psql, pgAdmin, etc.)
-- 
-- ⚠️  WARNING: This will permanently delete ALL data!
-- ⚠️  WARNING: Make sure you have a backup if needed!
-- 
-- Usage:
--   psql -d your_database -f scripts/clear-demo-data.sql
--   OR copy and paste sections into your SQL client

-- Start transaction for safety
BEGIN;

-- Display current row counts before deletion
SELECT 'CURRENT DATA SUMMARY' as status;

SELECT 
    'businesses' as table_name, 
    COUNT(*) as row_count 
FROM businesses
UNION ALL
SELECT 
    'users' as table_name, 
    COUNT(*) as row_count 
FROM users
UNION ALL
SELECT 
    'locations' as table_name, 
    COUNT(*) as row_count 
FROM locations
UNION ALL
SELECT 
    'products' as table_name, 
    COUNT(*) as row_count 
FROM products
UNION ALL
SELECT 
    'inventory' as table_name, 
    COUNT(*) as row_count 
FROM inventory
UNION ALL
SELECT 
    'transactions' as table_name, 
    COUNT(*) as row_count 
FROM transactions
UNION ALL
SELECT 
    'customers' as table_name, 
    COUNT(*) as row_count 
FROM customers
ORDER BY table_name;

-- Pause for review (comment out ROLLBACK and uncomment COMMIT to proceed)
SELECT 'Review the counts above. If you want to proceed:' as instruction;
SELECT '1. Comment out the ROLLBACK line at the bottom' as step_1;
SELECT '2. Uncomment the COMMIT line at the bottom' as step_2;
SELECT '3. Run this script again' as step_3;

-- ==========================================
-- DELETE DATA (in correct order for foreign keys)
-- ==========================================

-- Clear dependent tables first (those with foreign keys)

-- Audit and system logs
DELETE FROM audit_logs;
DELETE FROM sync_logs;
DELETE FROM backup_records;
DELETE FROM api_rate_limits;
DELETE FROM mobile_devices;

-- Transaction related tables
DELETE FROM offline_transactions;
DELETE FROM tips;
DELETE FROM transaction_payments;
DELETE FROM transaction_items;
DELETE FROM held_transactions;
DELETE FROM cash_sessions;
DELETE FROM shifts;

-- Loyalty and rewards
DELETE FROM loyalty_transactions;
DELETE FROM loyalty_rewards;

-- Customer related tables
DELETE FROM customer_segment_members;
DELETE FROM customer_feedback;
DELETE FROM customer_appointments;

-- Pharmacy tables
DELETE FROM prescription_items;
DELETE FROM prescriptions;
DELETE FROM drug_interactions;
DELETE FROM pharmacy_inventory;

-- Inventory management tables
DELETE FROM inventory_adjustment_logs;
DELETE FROM inventory_transfer_items;
DELETE FROM inventory_transfers;
DELETE FROM inventory;

-- Product related tables
DELETE FROM bundle_items;
DELETE FROM product_bundles;
DELETE FROM kit_components;
DELETE FROM product_kits;
DELETE FROM product_variants;
DELETE FROM product_reviews;
DELETE FROM price_history;

-- Purchase and vendor tables
DELETE FROM purchase_order_items;
DELETE FROM purchase_orders;
DELETE FROM vendor_contracts;

-- Equipment and maintenance
DELETE FROM maintenance_records;
DELETE FROM expenses;
DELETE FROM stock_alerts;
DELETE FROM reorder_suggestions;
DELETE FROM sales_forecasts;

-- E-commerce and integrations
DELETE FROM ecommerce_products;
DELETE FROM integration_configs;

-- Marketing and notifications
DELETE FROM notifications;
DELETE FROM promotions;
DELETE FROM campaigns;

-- Staff and scheduling
DELETE FROM employee_schedules;
DELETE FROM staff_invites;

-- Main transaction table
DELETE FROM transactions;

-- Independent tables (no foreign key dependencies)
DELETE FROM equipment;
DELETE FROM competitor_analysis;
DELETE FROM products;
DELETE FROM categories;
DELETE FROM suppliers;
DELETE FROM customers;
DELETE FROM customer_segments;
DELETE FROM patients;
DELETE FROM doctors;
DELETE FROM expense_categories;
DELETE FROM location_settings;

-- User and business tables (delete last)
DELETE FROM users;
DELETE FROM locations;
DELETE FROM businesses;

-- Show results
SELECT 'DATA DELETION COMPLETED' as status;

-- Show final counts (should all be 0)
SELECT 
    'businesses' as table_name, 
    COUNT(*) as remaining_rows 
FROM businesses
UNION ALL
SELECT 
    'users' as table_name, 
    COUNT(*) as remaining_rows 
FROM users
UNION ALL
SELECT 
    'locations' as table_name, 
    COUNT(*) as remaining_rows 
FROM locations
UNION ALL
SELECT 
    'products' as table_name, 
    COUNT(*) as remaining_rows 
FROM products
UNION ALL
SELECT 
    'inventory' as table_name, 
    COUNT(*) as remaining_rows 
FROM inventory
UNION ALL
SELECT 
    'transactions' as table_name, 
    COUNT(*) as remaining_rows 
FROM transactions
UNION ALL
SELECT 
    'customers' as table_name, 
    COUNT(*) as remaining_rows 
FROM customers
ORDER BY table_name;

-- ==========================================
-- SAFETY MEASURES
-- ==========================================

-- By default, rollback to prevent accidental execution
-- Comment out the ROLLBACK line and uncomment COMMIT to actually delete data
ROLLBACK;

-- Uncomment the line below to commit the changes
-- COMMIT;

-- ==========================================
-- ALTERNATIVE: Reset sequences (optional)
-- ==========================================
-- If you want to reset auto-increment sequences, uncomment below:

/*
-- Reset all sequences to start from 1
-- (Only needed if you have sequences, most UUID tables don't need this)

-- Example for any integer ID columns:
-- ALTER SEQUENCE some_table_id_seq RESTART WITH 1;

-- Get all sequences and reset them
DO $$
DECLARE
    seq_name TEXT;
BEGIN
    FOR seq_name IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE 'ALTER SEQUENCE ' || seq_name || ' RESTART WITH 1';
    END LOOP;
END $$;
*/