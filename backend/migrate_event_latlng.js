const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'healthcare_db'
  });

  try {
    await connection.query(`ALTER TABLE community_events DROP COLUMN map_link`);
    console.log('Dropped map_link from community_events');
  } catch (e) { 
    if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e; 
  }

  try {
    await connection.query(`ALTER TABLE community_events ADD COLUMN location_lat DECIMAL(10,8) DEFAULT NULL`);
    console.log('Added location_lat');
  } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; }

  try {
    await connection.query(`ALTER TABLE community_events ADD COLUMN location_lng DECIMAL(11,8) DEFAULT NULL`);
    console.log('Added location_lng');
  } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; }

  await connection.end();
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
