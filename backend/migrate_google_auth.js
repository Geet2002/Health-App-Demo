const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  console.log('Connecting to MySQL for Google Auth migrations...');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'healthcare_db'
  });

  console.log('Altering users table for Google Auth...');
  
  try {
    // Make password_hash nullable
    await connection.query(`ALTER TABLE users MODIFY password_hash VARCHAR(255) NULL`);
    console.log('Made password_hash nullable');
  } catch (err) {
    console.error('Error modifying password_hash:', err.message);
  }

  try {
    // Add google_id column
    await connection.query(`ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL UNIQUE`);
    console.log('Added google_id column');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') console.log('google_id already exists');
    else console.error('Error adding google_id:', err.message);
  }

  console.log('Migration complete!');
  await connection.end();
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
