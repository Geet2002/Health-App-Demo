const mysql = require('mysql2/promise');
require('dotenv').config({ path: '/Users/geetartha/Desktop/CareCommunityWebApp/backend/.env' });

async function check() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [rows] = await connection.query('SELECT id, username, profile_picture FROM users WHERE google_id IS NOT NULL');
  console.log(JSON.stringify(rows, null, 2));
  connection.end();
}

check().catch(console.error);
