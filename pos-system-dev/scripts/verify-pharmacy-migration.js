const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_dsOSp8rjfa6T@ep-old-field-a4umd7hy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

const verifyTables = async () => {
  try {
    console.log('🔍 Verifying pharmacy tables...');
    
    // Check if tables exist
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('inventory_alerts', 'alert_settings', 'currency_settings')
      ORDER BY table_name;
    `;
    
    const tables = await pool.query(tablesQuery);
    console.log('📋 Created tables:');
    tables.rows.forEach(row => {
      console.log(`    ✅ ${row.table_name}`);
    });
    
    // Check alert settings count
    const alertSettings = await pool.query('SELECT COUNT(*) as count FROM alert_settings;');
    console.log(`📊 Alert settings created for ${alertSettings.rows[0].count} businesses`);
    
    // Check currency settings count
    const currencySettings = await pool.query('SELECT COUNT(*) as count FROM currency_settings;');
    console.log(`💰 Currency settings (SLL) created for ${currencySettings.rows[0].count} businesses`);
    
    // Check sample currency setting
    const sampleCurrency = await pool.query('SELECT currency_code, currency_symbol, tax_rate FROM currency_settings LIMIT 1;');
    if (sampleCurrency.rows.length > 0) {
      const setting = sampleCurrency.rows[0];
      console.log(`🇸🇱 Sample currency config: ${setting.currency_symbol} (${setting.currency_code}) with ${(parseFloat(setting.tax_rate) * 100)}% tax`);
    }
    
    // Check if trigger was created
    const triggerQuery = `
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_name = 'trigger_generate_expiry_alerts';
    `;
    const triggers = await pool.query(triggerQuery);
    console.log(`⚡ Automatic expiry alert trigger: ${triggers.rows.length > 0 ? 'Active' : 'Not found'}`);
    
    console.log('\n🎉 Pharmacy system is ready!');
    console.log('Next steps:');
    console.log('  1. Navigate to /admin/pharmacy/products for drug management');
    console.log('  2. Set up alerts at /admin/pharmacy/alerts');
    console.log('  3. Configure SLL currency at /admin/settings/currency');
    console.log('  4. Monitor expiry with FEFO at /admin/pharmacy/fefo');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    await pool.end();
  }
};

verifyTables();