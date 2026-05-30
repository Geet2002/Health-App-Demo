const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  console.log('Connecting to MySQL...');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'healthcare_db'
  });

  console.log('Renaming columns in blood_donation_offers...');
  try {
    await connection.query(`ALTER TABLE blood_donation_offers RENAME COLUMN phone TO contact_phone_at_offer`);
    await connection.query(`ALTER TABLE blood_donation_offers RENAME COLUMN email TO contact_email_at_offer`);
    console.log('Migration successful: Columns renamed.');
  } catch (err) {
    console.error('Error renaming columns. They might already be renamed:', err.message);
  }

  await connection.end();
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
