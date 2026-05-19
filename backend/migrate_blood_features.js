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

  console.log('Creating blood_request_comments table...');
  await connection.query(`
    CREATE TABLE IF NOT EXISTS blood_request_comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      request_id INT NOT NULL,
      author_id INT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (request_id) REFERENCES blood_requests(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('Creating blood_donation_offers table...');
  await connection.query(`
    CREATE TABLE IF NOT EXISTS blood_donation_offers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      request_id INT NOT NULL,
      donor_id INT NOT NULL,
      phone VARCHAR(20) NOT NULL,
      email VARCHAR(255) NOT NULL,
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (request_id) REFERENCES blood_requests(id) ON DELETE CASCADE,
      FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('Migration successful: blood_request_comments and blood_donation_offers tables created.');
  await connection.end();
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
