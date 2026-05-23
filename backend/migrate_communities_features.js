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

  console.log('Altering users table to add medical professional flag...');
  try {
    await connection.query(`ALTER TABLE users ADD COLUMN is_medical_professional BOOLEAN DEFAULT FALSE`);
    console.log('Added is_medical_professional to users');
  } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; }
  
  console.log('Creating community_events table...');
  await connection.query(`
    CREATE TABLE IF NOT EXISTS community_events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      community_id INT NOT NULL,
      created_by INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      event_date DATETIME NOT NULL,
      location VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('Creating event_attendees table...');
  await connection.query(`
    CREATE TABLE IF NOT EXISTS event_attendees (
      event_id INT NOT NULL,
      user_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (event_id, user_id),
      FOREIGN KEY (event_id) REFERENCES community_events(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('Creating community_resources table...');
  await connection.query(`
    CREATE TABLE IF NOT EXISTS community_resources (
      id INT AUTO_INCREMENT PRIMARY KEY,
      community_id INT NOT NULL,
      created_by INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      link VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('Migration successful: community features added.');
  await connection.end();
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
