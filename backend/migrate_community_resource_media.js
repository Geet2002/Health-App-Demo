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

  try {
    console.log('Altering community_resources table...');
    await connection.query(`
      ALTER TABLE community_resources 
      ADD COLUMN file_path VARCHAR(255),
      ADD COLUMN file_type VARCHAR(50);
    `);
    console.log('Migration successful: file_path and file_type columns added.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Migration already applied. Columns exist.');
    } else {
      console.error('Migration failed:', err);
      process.exit(1);
    }
  }

  await connection.end();
}

migrate();
