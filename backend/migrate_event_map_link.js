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

  console.log('Altering community_events table to add map_link...');
  try {
    await connection.query(`ALTER TABLE community_events ADD COLUMN map_link VARCHAR(500) DEFAULT NULL`);
    console.log('Added map_link to community_events');
  } catch (e) { 
    if (e.code !== 'ER_DUP_FIELDNAME') throw e; 
    console.log('map_link already exists.');
  }

  await connection.end();
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
