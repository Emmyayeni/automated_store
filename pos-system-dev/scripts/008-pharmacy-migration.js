const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function createPharmacyTables() {
  try {
    console.log('🏥 Creating pharmacy-specific enums...');
    
    // Create enums
    await sql`
      DO $$ BEGIN
        CREATE TYPE drug_type AS ENUM ('prescription', 'otc', 'controlled', 'medical_device', 'supplement', 'personal_care');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    await sql`
      DO $$ BEGIN
        CREATE TYPE prescription_status AS ENUM ('pending', 'verified', 'dispensed', 'completed', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    await sql`
      DO $$ BEGIN
        CREATE TYPE drug_form AS ENUM ('tablet', 'capsule', 'syrup', 'injection', 'cream', 'ointment', 'drops', 'inhaler', 'patch', 'suppository');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    await sql`
      DO $$ BEGIN
        CREATE TYPE drug_storage AS ENUM ('room_temperature', 'refrigerated', 'frozen', 'controlled_room');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    await sql`
      DO $$ BEGIN
        CREATE TYPE patient_gender AS ENUM ('male', 'female', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    console.log('💊 Adding pharmacy fields to products table...');
    
    // Add pharmacy-specific fields to products table
    await sql`
      DO $$ BEGIN
        -- Add pharmacy-specific columns to products table
        ALTER TABLE products 
        ADD COLUMN IF NOT EXISTS drug_type drug_type DEFAULT 'otc',
        ADD COLUMN IF NOT EXISTS drug_form drug_form,
        ADD COLUMN IF NOT EXISTS strength text,
        ADD COLUMN IF NOT EXISTS generic_name text,
        ADD COLUMN IF NOT EXISTS brand_name text,
        ADD COLUMN IF NOT EXISTS manufacturer text,
        ADD COLUMN IF NOT EXISTS batch_number text,
        ADD COLUMN IF NOT EXISTS expiry_date date,
        ADD COLUMN IF NOT EXISTS manufacturing_date date,
        ADD COLUMN IF NOT EXISTS drug_license_number text,
        ADD COLUMN IF NOT EXISTS storage_conditions drug_storage DEFAULT 'room_temperature',
        ADD COLUMN IF NOT EXISTS active_ingredient text,
        ADD COLUMN IF NOT EXISTS dosage_instructions text,
        ADD COLUMN IF NOT EXISTS side_effects text,
        ADD COLUMN IF NOT EXISTS contraindications text,
        ADD COLUMN IF NOT EXISTS requires_prescription boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS is_controlled_substance boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS controlled_substance_schedule text;
      EXCEPTION
        WHEN duplicate_column THEN
          RAISE NOTICE 'Column already exists, skipping...';
      END $$;
    `;

    console.log('👥 Creating patients table...');
    
    // Create patients table
    await sql`
      CREATE TABLE IF NOT EXISTS patients (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        patient_number text NOT NULL UNIQUE,
        first_name text NOT NULL,
        last_name text NOT NULL,
        date_of_birth date,
        gender patient_gender,
        phone text,
        email text,
        address text,
        emergency_contact text,
        emergency_phone text,
        allergies text,
        medical_conditions text,
        current_medications text,
        insurance_provider text,
        insurance_number text,
        national_id text,
        is_active boolean DEFAULT true,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );
    `;

    console.log('👨‍⚕️ Creating doctors table...');
    
    // Create doctors table
    await sql`
      CREATE TABLE IF NOT EXISTS doctors (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        license_number text NOT NULL,
        first_name text NOT NULL,
        last_name text NOT NULL,
        specialization text,
        hospital text,
        phone text,
        email text,
        address text,
        is_active boolean DEFAULT true,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );
    `;

    console.log('📋 Creating prescriptions table...');
    
    // Create prescriptions table
    await sql`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        prescription_number text NOT NULL,
        patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
        date_issued date NOT NULL,
        status prescription_status DEFAULT 'pending',
        notes text,
        dispensed_by uuid REFERENCES users(id),
        dispensed_at timestamp with time zone,
        verified_by uuid REFERENCES users(id),
        verified_at timestamp with time zone,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );
    `;

    console.log('📝 Creating prescription items table...');
    
    // Create prescription items table
    await sql`
      CREATE TABLE IF NOT EXISTS prescription_items (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        prescription_id uuid NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
        product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity integer NOT NULL,
        dosage text NOT NULL,
        frequency text NOT NULL,
        duration text NOT NULL,
        instructions text,
        is_dispensed boolean DEFAULT false,
        dispensed_quantity integer DEFAULT 0,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );
    `;

    console.log('⚠️ Creating drug interactions table...');
    
    // Create drug interactions table
    await sql`
      CREATE TABLE IF NOT EXISTS drug_interactions (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        drug1_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        drug2_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        interaction_type text NOT NULL,
        description text NOT NULL,
        severity text NOT NULL,
        mechanism text,
        recommendation text,
        is_active boolean DEFAULT true,
        created_at timestamp with time zone DEFAULT now()
      );
    `;

    console.log('🏭 Creating pharmacy inventory table...');
    
    // Create pharmacy inventory table
    await sql`
      CREATE TABLE IF NOT EXISTS pharmacy_inventory (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        inventory_id uuid NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
        batch_number text NOT NULL,
        expiry_date date NOT NULL,
        manufacturing_date date,
        supplier_batch_number text,
        quantity integer NOT NULL DEFAULT 0,
        cost_price numeric(10,2),
        sell_price numeric(10,2),
        is_quarantined boolean DEFAULT false,
        quarantine_reason text,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );
    `;

    console.log('📊 Creating pharmacy indexes...');
    
    // Create indexes for performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_patients_business_id ON patients(business_id);
      CREATE INDEX IF NOT EXISTS idx_patients_patient_number ON patients(patient_number);
      CREATE INDEX IF NOT EXISTS idx_doctors_business_id ON doctors(business_id);
      CREATE INDEX IF NOT EXISTS idx_doctors_license_number ON doctors(license_number);
      CREATE INDEX IF NOT EXISTS idx_prescriptions_business_id ON prescriptions(business_id);
      CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
      CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON prescriptions(doctor_id);
      CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
      CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription_id ON prescription_items(prescription_id);
      CREATE INDEX IF NOT EXISTS idx_prescription_items_product_id ON prescription_items(product_id);
      CREATE INDEX IF NOT EXISTS idx_drug_interactions_drug1_id ON drug_interactions(drug1_id);
      CREATE INDEX IF NOT EXISTS idx_drug_interactions_drug2_id ON drug_interactions(drug2_id);
      CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_inventory_id ON pharmacy_inventory(inventory_id);
      CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_batch_number ON pharmacy_inventory(batch_number);
      CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_expiry_date ON pharmacy_inventory(expiry_date);
      CREATE INDEX IF NOT EXISTS idx_products_drug_type ON products(drug_type);
      CREATE INDEX IF NOT EXISTS idx_products_expiry_date ON products(expiry_date);
      CREATE INDEX IF NOT EXISTS idx_products_requires_prescription ON products(requires_prescription);
    `;

    console.log('✅ Pharmacy database migration completed successfully!');
    console.log('📋 Summary:');
    console.log('  - Added 5 pharmacy-specific enums');
    console.log('  - Enhanced products table with 17 pharmacy fields');
    console.log('  - Created 6 new pharmacy tables');
    console.log('  - Added 17 performance indexes');

  } catch (error) {
    console.error('❌ Error during pharmacy migration:', error);
    throw error;
  }
}

module.exports = { createPharmacyTables };

// Run if called directly
if (require.main === module) {
  createPharmacyTables()
    .then(() => {
      console.log('🎉 Pharmacy migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}
