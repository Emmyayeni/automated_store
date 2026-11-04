const { Client } = require('pg');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Function to generate a secure token
function generateToken() {
  return crypto.randomUUID();
}

// Function to add staff invitation
async function addStaffInvite(email, role, businessId, locationId) {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

  const query = `
    INSERT INTO staff_invites (email, role, business_id, location_id, token, expires_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, email, role, token, expires_at
  `;

  const values = [email, role, businessId, locationId, token, expiresAt];
  
  const result = await client.query(query, values);
  return result.rows[0];
}

async function main() {
  try {
    await client.connect();
    console.log('🔗 Connected to database');

    // Get the first business and location (you can modify these)
    const businessResult = await client.query('SELECT id, name FROM businesses LIMIT 1');
    const locationResult = await client.query('SELECT id, name FROM locations LIMIT 1');

    if (businessResult.rows.length === 0 || locationResult.rows.length === 0) {
      console.error('❌ No business or location found. Please run onboarding first.');
      return;
    }

    const businessId = businessResult.rows[0].id;
    const businessName = businessResult.rows[0].name;
    const locationId = locationResult.rows[0].id;
    const locationName = locationResult.rows[0].name;

    console.log(`📊 Using business: ${businessName} (${businessId})`);
    console.log(`🏪 Using location: ${locationName} (${locationId})`);

    // Add staff members
    const staffMembers = [
      { email: 'manager1@hardypos.com', role: 'MANAGER', name: 'Sarah Johnson' },
      { email: 'cashier1@hardypos.com', role: 'CASHIER', name: 'Mike Wilson' },
      { email: 'cashier2@hardypos.com', role: 'CASHIER', name: 'Lisa Chen' }
    ];

    console.log('\n👥 Adding staff invitations...\n');

    for (const staff of staffMembers) {
      try {
        // Check if user already exists
        const existingUser = await client.query('SELECT id, email FROM users WHERE email = $1', [staff.email]);
        
        if (existingUser.rows.length > 0) {
          console.log(`⚠️  User already exists: ${staff.email}`);
          continue;
        }

        // Check if invitation already exists
        const existingInvite = await client.query(
          'SELECT id, email FROM staff_invites WHERE email = $1 AND accepted = false', 
          [staff.email]
        );
        
        if (existingInvite.rows.length > 0) {
          console.log(`📧 Invitation already sent: ${staff.email}`);
          continue;
        }

        // Add new invitation
        const invitation = await addStaffInvite(staff.email, staff.role, businessId, locationId);
        
        console.log(`✅ ${staff.role}: ${staff.name} (${staff.email})`);
        console.log(`   📧 Invitation ID: ${invitation.id}`);
        console.log(`   🔗 Token: ${invitation.token}`);
        console.log(`   ⏰ Expires: ${invitation.expires_at}`);
        console.log(`   🌐 Accept URL: http://localhost:3000/accept-invite?token=${invitation.token}`);
        console.log('');

      } catch (error) {
        console.error(`❌ Error adding ${staff.email}:`, error.message);
      }
    }

    // Show summary
    console.log('\n📋 Summary of all pending invitations:');
    const allInvites = await client.query(`
      SELECT email, role, expires_at, token 
      FROM staff_invites 
      WHERE accepted = false 
      ORDER BY created_at DESC
    `);

    if (allInvites.rows.length === 0) {
      console.log('   No pending invitations found.');
    } else {
      allInvites.rows.forEach((invite, index) => {
        console.log(`   ${index + 1}. ${invite.role}: ${invite.email}`);
        console.log(`      🔗 http://localhost:3000/accept-invite?token=${invite.token}`);
        console.log(`      ⏰ Expires: ${new Date(invite.expires_at).toLocaleDateString()}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
    console.log('\n🔚 Connection closed');
  }
}

main();
