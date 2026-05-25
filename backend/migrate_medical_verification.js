import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(process.cwd(), '.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'care_community',
  multipleStatements: true
};

async function migrate() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to the database.');

    // Add medical_verification_status
    console.log('Adding medical_verification_status to users table...');
    try {
      await connection.query(`ALTER TABLE users ADD COLUMN medical_verification_status VARCHAR(20) DEFAULT 'none'`);
      console.log('Added medical_verification_status successfully.');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('medical_verification_status column already exists. Skipping.');
      } else {
        throw err;
      }
    }

    // Set existing verified users to 'approved'
    console.log('Setting status to approved for already verified users...');
    await connection.query(`UPDATE users SET medical_verification_status = 'approved' WHERE is_medical_professional = 1`);
    console.log('Update complete.');

    console.log('Migration completed successfully.');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
    process.exit(0);
  }
}

migrate();
