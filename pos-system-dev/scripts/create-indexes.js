const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function createIndexes() {
  try {
    console.log('🔗 Connecting to Neon database...');
    const sql = neon(process.env.DATABASE_URL);

    // Create indexes using template literals
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_inventory_adjustment_logs_location ON inventory_adjustment_logs(location_id)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_adjustment_logs_product ON inventory_adjustment_logs(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_adjustment_logs_type ON inventory_adjustment_logs(adjustment_type)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_adjustment_logs_date ON inventory_adjustment_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_adjustment_logs_adjusted_by ON inventory_adjustment_logs(adjusted_by)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_transfers_number ON inventory_transfers(transfer_number)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_transfers_from ON inventory_transfers(from_location_id)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_transfers_to ON inventory_transfers(to_location_id)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_transfers_status ON inventory_transfers(status)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_transfer_items_transfer ON inventory_transfer_items(transfer_id)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_transfer_items_product ON inventory_transfer_items(product_id)'
    ];

    for (let i = 0; i < indexes.length; i++) {
      try {
        console.log(`⚡ Creating index ${i + 1}/${indexes.length}...`);
        await sql`${sql.unsafe(indexes[i])}`;
        console.log(`✅ Index ${i + 1} created successfully`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Index ${i + 1} already exists, skipping...`);
        } else {
          console.error(`❌ Error creating index ${i + 1}:`, error.message);
        }
      }
    }

    console.log('\n🎉 All indexes created successfully!');
    
  } catch (error) {
    console.error('❌ Index creation failed:', error.message);
    process.exit(1);
  }
}

createIndexes();
