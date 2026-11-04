const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_dsOSp8rjfa6T@ep-old-field-a4umd7hy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function runMigration() {
  try {
    console.log('🔄 Running medical equipment fields migration...');
    
    const sql = fs.readFileSync('./scripts/011-medical-equipment-fields.sql', 'utf8');
    await pool.query(sql);
    
    console.log('✅ Medical equipment fields migration completed successfully!');
    
    // Show the verification results
    console.log('\n📊 Product category summary:');
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN category = 'pharmaceuticals' THEN 1 END) as pharmaceuticals,
        COUNT(CASE WHEN category = 'medical-equipment' THEN 1 END) as medical_equipment,
        COUNT(CASE WHEN category = 'laboratory-equipment' THEN 1 END) as lab_equipment,
        COUNT(CASE WHEN category = 'medical-supplies' THEN 1 END) as medical_supplies,
        COUNT(CASE WHEN category = 'other' THEN 1 END) as other_products
      FROM products
    `);
    console.table(result.rows[0]);
    
    await pool.end();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

runMigration();