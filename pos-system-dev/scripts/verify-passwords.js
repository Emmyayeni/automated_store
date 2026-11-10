const { Pool } = require('pg');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const res = await pool.query('SELECT email, password_hash, is_active FROM users');
  console.log('--- Checking User Passwords with "password123" ---');
  for (const user of res.rows) {
    const match = await bcrypt.compare('password123', user.password_hash);
    console.log(`User: ${user.email.padEnd(22)} | Active: ${user.is_active} | password123 match: ${match ? '✅ MATCH' : '❌ MISMATCH'}`);
  }
  await pool.end();
}

check().catch(console.error);
