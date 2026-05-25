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
    console.log('Adding is_admin column to users table if it does not exist...');
    
    // Check if column exists first
    const [columns] = await connection.query(`SHOW COLUMNS FROM users LIKE 'is_admin'`);
    if (columns.length === 0) {
      await connection.query(`ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE`);
      console.log('Column is_admin added successfully.');
    } else {
      console.log('Column is_admin already exists.');
    }

    console.log('Promoting user "admin" to admin...');
    const [result] = await connection.query(`UPDATE users SET is_admin = TRUE WHERE username = 'admin'`);
    
    if (result.affectedRows > 0) {
      console.log('User "admin" has been promoted to administrator.');
    } else {
      console.log('User "admin" was not found in the database. Ensure the user is created first.');
    }

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

migrate();
