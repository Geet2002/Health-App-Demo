const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'healthcare_db'
  });

  const [rows] = await connection.query('SELECT * FROM community_events WHERE title LIKE "%Yoga%"');
  console.log(rows);
  await connection.end();
}
check();
